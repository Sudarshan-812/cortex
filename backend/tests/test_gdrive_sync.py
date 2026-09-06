"""Part-3 unit tests - mocked Drive HTTP + in-memory DB.

Covers: atomic chunk replace (no orphans), strict backpressure, rate-limit
fallback, per-file failure isolation + watermark hold. Supabase-integration
and ACL-leak tests are Part 5.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from core.config import Settings
from core.retry import request_with_retry
from integrations.gdrive import DriveSyncer, GoogleDriveClient, _batched
from models.chunk import Chunk, ChunkMetadata, ParsedDocument
from models.sync import ConnectorCredentials, DriveFile
from services.parser import DocumentParseError

UTC = timezone.utc


# ---- fakes --------------------------------------------------------------


class FakeConn:
    def __init__(self, store: "FakeStore") -> None:
        self.store = store

    def transaction(self):
        class _Txn:
            async def __aenter__(_self):
                return None

            async def __aexit__(_self, *a):
                return False

        return _Txn()

    async def fetchval(self, sql, *args):
        s = " ".join(sql.split())
        if s.startswith("INSERT INTO documents"):
            workspace_id, _name, _sp, _ft, _sz, external_id = args[:6]
            return self.store.upsert_document(workspace_id, external_id)
        if s.startswith("SELECT last_synced_at FROM drive_sync_state"):
            return self.store.watermarks.get((args[0], args[1]))
        raise AssertionError(f"unexpected fetchval: {s[:70]}")

    async def fetchrow(self, sql, *args):
        return self.store.connector_row(*args)

    async def execute(self, sql, *args):
        s = " ".join(sql.split())
        if s.startswith("DELETE FROM document_chunks"):
            self.store.delete_chunks(doc_id=args[0], external_id=args[1])
        elif s.startswith("INSERT INTO drive_sync_state"):
            self.store.watermarks[(args[0], args[1])] = args[2]
            self.store.last_status = args[3]
        elif s.startswith("UPDATE connector_accounts"):
            self.store.saved_tokens.append((args[0], args[1], args[2]))
        elif s.startswith("CREATE TABLE"):
            pass
        else:
            raise AssertionError(f"unexpected execute: {s[:70]}")

    async def executemany(self, sql, rows):
        assert "INSERT INTO document_chunks" in sql
        for r in rows:
            self.store.chunks.append(
                {"document_id": r[0], "content": r[1], "external_id": r[4]}
            )


class FakeStore:
    def __init__(self, watermark: datetime | None = None) -> None:
        self.chunks: list[dict] = []
        self.docs: dict[tuple, str] = {}
        self.watermarks: dict[tuple, datetime] = {}
        self.saved_tokens: list = []
        self.last_status: str | None = None
        if watermark is not None:
            self.watermarks[("acct-1", "folder-1")] = watermark

    def upsert_document(self, workspace_id, external_id):
        return self.docs.setdefault((workspace_id, external_id), str(uuid.uuid4()))

    def delete_chunks(self, *, doc_id, external_id):
        self.chunks = [
            c
            for c in self.chunks
            if not (c["document_id"] == doc_id and c["external_id"] == external_id)
        ]

    def connector_row(self, user_id, provider):
        return {
            "id": "acct-1",
            "user_id": user_id,
            "workspace_id": "ws-1",
            "provider": provider,
            "access_token": None,
            "access_token_expires_at": None,
            "scopes": [],
            "refresh_token": "refresh-xyz",
        }


class FakePool:
    def __init__(self, store: FakeStore) -> None:
        self.store = store

    def acquire(self):
        store = self.store

        class _Acq:
            async def __aenter__(_self):
                return FakeConn(store)

            async def __aexit__(_self, *a):
                return False

        return _Acq()


class ConcurrencyTracker:
    def __init__(self) -> None:
        self.active = 0
        self.max = 0

    async def enter(self):
        self.active += 1
        self.max = max(self.max, self.active)

    def exit(self):
        self.active -= 1


class FakeDriveClient:
    def __init__(self, files, *, track: ConcurrencyTracker | None = None) -> None:
        self._files = files
        self._track = track

    async def list_folder_tree(self, folder_id, *, modified_since=None):
        return [
            f
            for f in self._files
            if modified_since is None or f.modified_time > modified_since
        ]

    async def download(self, f: DriveFile):
        if self._track is not None:
            await self._track.enter()
        try:
            await asyncio.sleep(0.01)
            return b"bytes", ".pdf"
        finally:
            if self._track is not None:
                self._track.exit()

    async def aclose(self):
        pass


class FakeParser:
    def __init__(self, k: int = 3, fail_ids: set[str] | None = None) -> None:
        self._k = k
        self._fail = fail_ids or set()

    def parse_document(self, data, *, filename=None):
        stem = (filename or "").rsplit(".", 1)[0]
        if stem in self._fail:
            raise DocumentParseError(f"boom {stem}")
        return ParsedDocument(
            chunks=[
                Chunk(text=f"{stem} chunk {i}", metadata=ChunkMetadata(), confidence=0.9)
                for i in range(self._k)
            ]
        )


class FakeEmbedder:
    async def embed(self, texts):
        return [[0.0] * 8 for _ in texts]


class _FakeTokenStore:
    def __init__(self, store: FakeStore) -> None:
        self._store = store

    async def load(self, user_id, provider="gdrive"):
        return _creds()

    async def save_access_token(self, *a):
        self._store.saved_tokens.append(a)


# ---- builders ---------------------------------------------------------


def _mk_files(n: int, base_time: datetime):
    return [
        DriveFile(
            id=f"file-{i}",
            name=f"file-{i}",
            mime_type="application/pdf",
            modified_time=base_time + timedelta(minutes=i),
        )
        for i in range(n)
    ]


def _creds():
    return ConnectorCredentials(
        account_id="acct-1",
        user_id="user-1",
        workspace_id="ws-1",
        refresh_token="refresh-xyz",
    )


def _syncer(store, drive, parser, *, settings: Settings | None = None):
    s = settings or Settings(sync_max_concurrency=4, sync_batch_size=25, embed_batch_size=16)

    async def factory(_creds_):
        return drive

    return DriveSyncer(
        FakePool(store),
        s,
        parser=parser,
        embedder=FakeEmbedder(),
        token_store=_FakeTokenStore(store),
        drive_client_factory=factory,
    )


# ---- tests ----------------------------------------------------------


def test_batched_shapes():
    assert [len(b) for b in _batched(range(10), 3)] == [3, 3, 3, 1]
    assert list(_batched([], 3)) == []


@pytest.mark.asyncio
async def test_atomic_replace_leaves_no_orphan_chunks():
    store = FakeStore()
    v1 = [
        DriveFile(
            id="file-0",
            name="file-0",
            mime_type="application/pdf",
            modified_time=datetime(2024, 1, 1, tzinfo=UTC),
        )
    ]
    await _syncer(store, FakeDriveClient(v1), FakeParser(k=3)).sync_drive_folder(
        "folder-1", "user-1"
    )
    assert len(store.chunks) == 3

    # file edited in Drive (newer modifiedTime) -> re-synced, now 2 chunks.
    # Old 3 must be gone, not 3 + 2.
    v2 = [
        DriveFile(
            id="file-0",
            name="file-0",
            mime_type="application/pdf",
            modified_time=datetime(2024, 1, 2, tzinfo=UTC),
        )
    ]
    await _syncer(store, FakeDriveClient(v2), FakeParser(k=2)).sync_drive_folder(
        "folder-1", "user-1"
    )
    assert len(store.chunks) == 2
    assert {c["external_id"] for c in store.chunks} == {"file-0"}


@pytest.mark.asyncio
async def test_unmodified_file_is_skipped_on_resync():
    store = FakeStore()
    files = _mk_files(1, datetime(2024, 1, 1, tzinfo=UTC))
    await _syncer(store, FakeDriveClient(files), FakeParser(k=3)).sync_drive_folder(
        "folder-1", "user-1"
    )
    report = await _syncer(
        store, FakeDriveClient(files), FakeParser(k=3)
    ).sync_drive_folder("folder-1", "user-1")
    assert report.scanned == 0
    assert len(store.chunks) == 3


@pytest.mark.asyncio
async def test_strict_backpressure_bounds_concurrency():
    store = FakeStore()
    track = ConcurrencyTracker()
    files = _mk_files(12, datetime(2024, 1, 1, tzinfo=UTC))
    settings = Settings(sync_max_concurrency=3, sync_batch_size=100)
    await _syncer(
        store, FakeDriveClient(files, track=track), FakeParser(k=1), settings=settings
    ).sync_drive_folder("folder-1", "user-1")
    assert track.max <= 3
    assert len(store.chunks) == 12


@pytest.mark.asyncio
async def test_one_bad_file_does_not_abort_batch_and_holds_watermark():
    store = FakeStore(watermark=datetime(2023, 1, 1, tzinfo=UTC))
    files = _mk_files(3, datetime(2024, 1, 1, tzinfo=UTC))
    report = await _syncer(
        store, FakeDriveClient(files), FakeParser(k=2, fail_ids={"file-1"})
    ).sync_drive_folder("folder-1", "user-1")

    assert (report.synced, report.failed) == (2, 1)
    assert len(store.chunks) == 4  # 2 good files x 2 chunks
    assert store.watermarks[("acct-1", "folder-1")] == datetime(2023, 1, 1, tzinfo=UTC)


@pytest.mark.asyncio
async def test_clean_run_advances_watermark_to_newest_modified_time():
    store = FakeStore()
    base = datetime(2024, 3, 1, tzinfo=UTC)
    report = await _syncer(
        store, FakeDriveClient(_mk_files(3, base)), FakeParser(k=1)
    ).sync_drive_folder("folder-1", "user-1")
    assert report.watermark == base + timedelta(minutes=2)


@pytest.mark.asyncio
async def test_token_refresh_then_cache():
    calls = {"post": 0}

    class FakeHTTP:
        async def post(self, url, data=None, **kw):
            calls["post"] += 1
            return httpx.Response(
                200,
                json={"access_token": "fresh", "expires_in": 3600},
                request=httpx.Request("POST", url),
            )

        async def aclose(self):
            pass

    store = FakeStore()
    client = GoogleDriveClient(
        _creds(), Settings(), token_store=_FakeTokenStore(store), client=FakeHTTP()
    )
    assert await client._access_token() == "fresh"
    assert await client._access_token() == "fresh"  # cached, no second POST
    assert calls["post"] == 1
    assert store.saved_tokens and store.saved_tokens[0][1] == "fresh"


@pytest.mark.asyncio
async def test_request_with_retry_recovers_from_429(monkeypatch):
    real_sleep = asyncio.sleep
    monkeypatch.setattr(asyncio, "sleep", lambda *a, **k: real_sleep(0))
    seq = [429, 429, 200]
    req = httpx.Request("GET", "https://x")

    async def send():
        return httpx.Response(seq.pop(0), request=req)

    resp = await request_with_retry(send, max_retries=5, base_delay=0)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_request_with_retry_gives_up(monkeypatch):
    real_sleep = asyncio.sleep
    monkeypatch.setattr(asyncio, "sleep", lambda *a, **k: real_sleep(0))
    req = httpx.Request("GET", "https://x")

    async def send():
        return httpx.Response(503, request=req)

    with pytest.raises(httpx.HTTPStatusError):
        await request_with_retry(send, max_retries=2, base_delay=0)
