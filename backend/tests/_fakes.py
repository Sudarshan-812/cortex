"""Shared test doubles for the Part-5 integration harness.

FakeDB is a tiny in-memory model of the slice of Postgres the pipeline touches:
the ACL predicate of `match_hybrid_documents` / `_ACL_SQL`, the documents upsert,
and the atomic chunk-replace transaction (snapshot + restore on exception).
"""
from __future__ import annotations

import copy
import json
import uuid

import httpx

from models.chunk import Chunk, ChunkMetadata, ParsedDocument
from services.parser import DocumentParseError


def _uid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------- fake DB


class FakeDB:
    def __init__(self) -> None:
        self.workspaces: dict[str, str] = {}          # ws_id -> owner_id
        self.members: set[tuple[str, str]] = set()     # (ws_id, user_id)
        self.documents: dict[str, dict] = {}           # doc_id -> row
        self._doc_by_ext: dict[tuple[str, str], str] = {}
        self.chunks: list[dict] = []                   # id, document_id, external_id, content, metadata, acl, relevance
        self.sync_state: dict[tuple[str, str], dict] = {}
        self.connectors: dict[tuple[str, str], dict] = {}
        self.saved_tokens: list = []
        self.raise_on_executemany = False

    # -- seeding --

    def add_workspace(self, owner_id: str, ws_id: str | None = None) -> str:
        ws_id = ws_id or _uid()
        self.workspaces[ws_id] = owner_id
        return ws_id

    def add_member(self, ws_id: str, user_id: str) -> None:
        self.members.add((ws_id, user_id))

    def add_document(self, ws_id: str, *, external_id=None, doc_id=None, name="doc.pdf") -> str:
        doc_id = doc_id or _uid()
        self.documents[doc_id] = {"workspace_id": ws_id, "external_id": external_id, "name": name}
        if external_id is not None:
            self._doc_by_ext[(ws_id, external_id)] = doc_id
        return doc_id

    def add_chunk(
        self, doc_id: str, content: str, *, acl=None, metadata=None, relevance=1.0
    ) -> str:
        cid = _uid()
        self.chunks.append(
            {
                "id": cid,
                "document_id": doc_id,
                "external_id": self.documents[doc_id]["external_id"],
                "content": content,
                "metadata": metadata or {},
                "acl": acl or {},
                "relevance": relevance,
            }
        )
        return cid

    def add_connector(
        self, user_id, ws_id, *, account_id="acct-1", refresh_token="refresh-xyz", provider="gdrive"
    ) -> str:
        self.connectors[(user_id, provider)] = {
            "id": account_id,
            "user_id": user_id,
            "workspace_id": ws_id,
            "provider": provider,
            "access_token": None,
            "access_token_expires_at": None,
            "scopes": [],
            "refresh_token": refresh_token,
        }
        return account_id

    # -- ACL predicate (mirrors _ACL_SQL / match_hybrid_documents) --

    def visible(self, chunk: dict, auth_uid: str, workspace_id: str | None = None) -> bool:
        ws = self.documents[chunk["document_id"]]["workspace_id"]
        if workspace_id is not None and ws != workspace_id:
            return False
        if self.workspaces.get(ws) == auth_uid:
            return True
        if (ws, auth_uid) in self.members:
            return True
        acl = chunk["acl"] or {}
        if acl.get("public") is True or str(acl.get("public", "")).lower() == "true":
            return True
        return auth_uid in (acl.get("users") or [])

    def search(self, auth_uid: str, workspace_id: str | None, limit: int) -> list[dict]:
        rows = [c for c in self.chunks if self.visible(c, auth_uid, workspace_id)]
        rows.sort(key=lambda c: c["relevance"], reverse=True)
        out = []
        for c in rows[:limit]:
            out.append(
                {
                    "id": c["id"],
                    "document_id": c["document_id"],
                    "content": c["content"],
                    "metadata": dict(c["metadata"]),
                    "source_name": self.documents[c["document_id"]]["name"],
                    "similarity": c["relevance"],
                }
            )
        return out


class FakeConn:
    def __init__(self, db: FakeDB) -> None:
        self.db = db
        self._snapshot = None

    def transaction(self):
        conn = self

        class _Txn:
            async def __aenter__(_s):
                conn._snapshot = (
                    copy.deepcopy(conn.db.chunks),
                    copy.deepcopy(conn.db.documents),
                    copy.deepcopy(conn.db._doc_by_ext),
                )
                return None

            async def __aexit__(_s, et, ev, tb):
                if et is not None and conn._snapshot is not None:
                    conn.db.chunks, conn.db.documents, conn.db._doc_by_ext = conn._snapshot
                conn._snapshot = None
                return False

        return _Txn()

    async def fetch(self, sql, *args):
        s = " ".join(sql.split())
        if "match_hybrid_documents" in s:
            _qvec, _q, auth_uid, _thr, limit, ws = args
            return self.db.search(auth_uid, ws, limit)
        if "1 - (dc.embedding <=> $1) AS similarity" in s:  # dense (app mode)
            _qvec, auth_uid, ws, _thr, n = args
            return self.db.search(auth_uid, ws, n)
        if "ts_rank_cd(" in s:  # lexical (app mode)
            _q, auth_uid, ws, n = args
            return self.db.search(auth_uid, ws, n)
        raise AssertionError(f"unhandled fetch: {s[:90]}")

    async def fetchval(self, sql, *args):
        s = " ".join(sql.split())
        if s.startswith("INSERT INTO documents"):
            ws, name, _sp, _ft, _sz, ext, _mtime = args
            doc_id = self.db._doc_by_ext.get((ws, ext))
            if doc_id is None:
                doc_id = self.db.add_document(ws, external_id=ext, name=name)
            else:
                self.db.documents[doc_id]["name"] = name
            return doc_id
        if s.startswith("SELECT last_synced_at FROM drive_sync_state"):
            st = self.db.sync_state.get((args[0], args[1]))
            return st["last_synced_at"] if st else None
        raise AssertionError(f"unhandled fetchval: {s[:90]}")

    async def fetchrow(self, sql, *args):
        s = " ".join(sql.split())
        if "FROM connector_accounts" in s:
            row = self.db.connectors.get((args[0], args[1]))
            return dict(row) if row else None
        raise AssertionError(f"unhandled fetchrow: {s[:90]}")

    async def execute(self, sql, *args):
        s = " ".join(sql.split())
        if s.startswith("DELETE FROM document_chunks"):
            doc_id, ext = args
            self.db.chunks = [
                c
                for c in self.db.chunks
                if not (c["document_id"] == doc_id and c["external_id"] == ext)
            ]
        elif s.startswith("INSERT INTO drive_sync_state"):
            self.db.sync_state[(args[0], args[1])] = {
                "last_synced_at": args[2],
                "last_status": args[3],
            }
        elif s.startswith("UPDATE connector_accounts"):
            self.db.saved_tokens.append((args[0], args[1], args[2]))
        elif s.startswith("CREATE TABLE"):
            pass
        else:
            raise AssertionError(f"unhandled execute: {s[:90]}")

    async def executemany(self, sql, rows):
        assert "INSERT INTO document_chunks" in sql
        if self.db.raise_on_executemany:
            raise RuntimeError("simulated write failure")
        for r in rows:
            doc_id, content, _emb, _model, ext, meta_json, _mtime = r
            self.db.chunks.append(
                {
                    "id": _uid(),
                    "document_id": doc_id,
                    "external_id": ext,
                    "content": content,
                    "metadata": json.loads(meta_json),
                    "acl": {},
                    "relevance": 1.0,
                }
            )


class FakePool:
    def __init__(self, db: FakeDB) -> None:
        self.db = db

    def acquire(self):
        db = self.db

        class _Acq:
            async def __aenter__(_s):
                return FakeConn(db)

            async def __aexit__(_s, *a):
                return False

        return _Acq()


# ---------------------------------------------------------------- fake AI


class FakeEmbedder:
    def __init__(self, dim: int = 8) -> None:
        self._dim = dim

    async def embed(self, texts):
        return [[0.0] * self._dim for _ in texts]


class FakeParser:
    def __init__(self, k: int = 3, *, fail_ids=None, chunks_by_stem=None) -> None:
        self.k = k
        self.fail = set(fail_ids or ())
        self.by_stem = chunks_by_stem or {}

    def parse_document(self, data, *, filename=None) -> ParsedDocument:
        stem = (filename or "").rsplit(".", 1)[0]
        if stem in self.fail:
            raise DocumentParseError(f"boom {stem}")
        k = self.by_stem.get(stem, self.k)
        return ParsedDocument(
            chunks=[
                Chunk(text=f"{stem} c{i}", metadata=ChunkMetadata(), confidence=0.9)
                for i in range(k)
            ]
        )


def rate_limited_client(status: int = 429) -> httpx.AsyncClient:
    """AsyncClient whose every request returns `status` — drives retry exhaustion."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json={"error": "rate_limited"}, request=request)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler), timeout=5)


# ---------------------------------------------------------------- fake Drive


class FakeDriveTransport:
    """httpx MockTransport handler emulating Drive v3 + OAuth, with 429 injection."""

    def __init__(
        self,
        files: list[dict],
        *,
        token_429: int = 0,
        list_429: int = 0,
        fail_downloads: set[str] | None = None,
    ) -> None:
        self.files = files
        self._token_429 = token_429
        self._list_429 = list_429
        self._fail_dl = fail_downloads or set()
        self.calls: list[str] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        self.calls.append(url)
        if url.startswith("https://oauth2.googleapis.com/token"):
            if self._token_429 > 0:
                self._token_429 -= 1
                return httpx.Response(429, json={}, request=request)
            return httpx.Response(
                200, json={"access_token": "at", "expires_in": 3600}, request=request
            )
        if "/drive/v3/files/" in url and ("alt=media" in url or "/export" in url):
            fid = url.split("/drive/v3/files/")[1].split("?")[0].split("/")[0]
            if fid in self._fail_dl:
                return httpx.Response(429, json={}, request=request)
            return httpx.Response(200, content=b"%PDF-1.4 fake", request=request)
        if "/drive/v3/files" in url:
            if self._list_429 > 0:
                self._list_429 -= 1
                return httpx.Response(429, json={}, request=request)
            return httpx.Response(
                200, json={"files": self.files, "nextPageToken": None}, request=request
            )
        return httpx.Response(404, json={}, request=request)


def drive_file(fid: str, modified: str, *, name=None, mime="application/pdf") -> dict:
    return {
        "id": fid,
        "name": name or fid,
        "mimeType": mime,
        "modifiedTime": modified,
        "size": "123",
        "parents": ["folder-1"],
    }
