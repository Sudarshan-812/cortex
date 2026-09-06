"""Google Drive connector + delta syncer.

sync_drive_folder(folder_id, user_id):
  1. load OAuth creds (refresh token from Supabase Vault) + target workspace
  2. BFS the folder tree; keep files with modifiedTime > folder watermark
  3. bounded worker pool (semaphore + fixed-size batches) - strict backpressure
  4. per file, ONE transaction:
       upsert documents row (by workspace_id, external_id),
       DELETE document_chunks WHERE external_id = fileId,
       bulk-insert freshly parsed + embedded chunks
  5. advance the folder watermark iff nothing failed

Hard-delete reconciliation (Drive `changes` API for files removed/moved out of the
folder) is intentionally out of scope here; add it as a follow-up.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from collections.abc import Iterable, Iterator, Sequence
from datetime import datetime, timedelta, timezone

import httpx

from core.config import Settings, get_settings
from core.retry import request_with_retry
from models.chunk import Chunk
from models.sync import ConnectorCredentials, DriveFile, SyncItemResult, SyncReport
from services.embeddings import GeminiEmbedder
from services.gemini import GeminiStructured
from services.parser import DocumentParseError, StructuralDocumentParser, UnsupportedFormatError

logger = logging.getLogger("cortex.gdrive")

_SUMMARY_SYS = "Summarize the document in 2 sentences, then list exactly 5 key topics."
_SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "topics": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "topics"],
}

_DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"
_OAUTH_TOKEN = "https://oauth2.googleapis.com/token"
_TOKEN_SKEW = timedelta(seconds=60)
_FOLDER_ID_RE = re.compile(r"^[A-Za-z0-9_-]+$")

# Google-native -> (export mime, extension the Part-2 parser accepts)
_EXPORT_MAP = {
    "application/vnd.google-apps.document": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".docx",
    ),
    "application/vnd.google-apps.spreadsheet": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xlsx",
    ),
    "application/vnd.google-apps.presentation": ("application/pdf", ".pdf"),
}
_NATIVE_EXT = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}


class DriveAuthError(RuntimeError):
    ...


# ---------------------------------------------------------------- token store


class SupabaseTokenStore:
    """Loads the connector row and decrypts its refresh token via Supabase Vault."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def load(self, user_id: str, provider: str = "gdrive") -> ConnectorCredentials:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT ca.id, ca.user_id, ca.workspace_id, ca.provider,
                       ca.access_token, ca.access_token_expires_at, ca.scopes,
                       vs.decrypted_secret AS refresh_token
                FROM connector_accounts ca
                LEFT JOIN vault.decrypted_secrets vs ON vs.id = ca.refresh_token_secret_id
                WHERE ca.user_id = $1 AND ca.provider = $2
                """,
                user_id,
                provider,
            )
        if row is None:
            raise DriveAuthError(f"no {provider} connector for user {user_id}")
        if not row["refresh_token"]:
            raise DriveAuthError(f"{provider} connector {row['id']} has no vault refresh token")
        return ConnectorCredentials(
            account_id=str(row["id"]),
            user_id=str(row["user_id"]),
            workspace_id=str(row["workspace_id"]),
            provider=row["provider"],
            refresh_token=row["refresh_token"],
            access_token=row["access_token"],
            access_token_expires_at=row["access_token_expires_at"],
            scopes=list(row["scopes"] or []),
        )

    async def save_access_token(
        self, account_id: str, token: str, expires_at: datetime
    ) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """UPDATE connector_accounts
                   SET access_token = $2, access_token_expires_at = $3, updated_at = now()
                   WHERE id = $1""",
                account_id,
                token,
                expires_at,
            )


# ---------------------------------------------------------------- drive client


class GoogleDriveClient:
    def __init__(
        self,
        creds: ConnectorCredentials,
        settings: Settings,
        *,
        token_store: SupabaseTokenStore | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._creds = creds
        self._s = settings
        self._store = token_store
        self._client = client or httpx.AsyncClient(timeout=60)
        self._owns_client = client is None
        self._refresh_lock = asyncio.Lock()

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> "GoogleDriveClient":
        return self

    async def __aexit__(self, *_exc) -> None:
        await self.aclose()

    # -- auth --

    async def _access_token(self) -> str:
        if self._token_valid():
            return self._creds.access_token  # type: ignore[return-value]
        async with self._refresh_lock:
            if self._token_valid():
                return self._creds.access_token  # type: ignore[return-value]
            resp = await request_with_retry(
                lambda: self._client.post(
                    _OAUTH_TOKEN,
                    data={
                        "client_id": self._s.google_oauth_client_id,
                        "client_secret": self._s.google_oauth_client_secret,
                        "refresh_token": self._creds.refresh_token,
                        "grant_type": "refresh_token",
                    },
                ),
                max_retries=self._s.http_max_retries,
            )
            tok = resp.json()
            if "access_token" not in tok:
                raise DriveAuthError(f"token refresh failed: {tok.get('error', tok)}")
            self._creds.access_token = tok["access_token"]
            self._creds.access_token_expires_at = _utcnow() + timedelta(
                seconds=int(tok.get("expires_in", 3600))
            )
            if self._store is not None:
                await self._store.save_access_token(
                    self._creds.account_id,
                    self._creds.access_token,
                    self._creds.access_token_expires_at,
                )
            return self._creds.access_token

    def _token_valid(self) -> bool:
        c = self._creds
        return bool(
            c.access_token
            and c.access_token_expires_at
            and c.access_token_expires_at > _utcnow() + _TOKEN_SKEW
        )

    async def _get(self, url: str, **params) -> httpx.Response:
        headers = {"Authorization": f"Bearer {await self._access_token()}"}
        return await request_with_retry(
            lambda: self._client.get(url, headers=headers, params=params),
            max_retries=self._s.http_max_retries,
        )

    # -- listing / download --

    async def list_folder_tree(
        self, folder_id: str, *, modified_since: datetime | None = None
    ) -> list[DriveFile]:
        if not _FOLDER_ID_RE.match(folder_id):
            raise ValueError(f"invalid drive folder id: {folder_id!r}")
        queue: list[str] = [folder_id]
        seen: set[str] = set()
        out: list[DriveFile] = []
        while queue:
            fid = queue.pop()
            if fid in seen:
                continue
            seen.add(fid)
            page_token: str | None = None
            while True:
                params = {
                    "q": f"'{fid}' in parents and trashed = false",
                    "fields": (
                        "nextPageToken, files(id,name,mimeType,modifiedTime,size,parents)"
                    ),
                    "pageSize": 1000,
                    "supportsAllDrives": "true",
                    "includeItemsFromAllDrives": "true",
                }
                if page_token:
                    params["pageToken"] = page_token
                data = (await self._get(_DRIVE_FILES, **params)).json()
                for raw in data.get("files", []):
                    f = _to_drive_file(raw)
                    if f.is_folder:
                        queue.append(f.id)
                    elif modified_since is None or f.modified_time > modified_since:
                        out.append(f)
                page_token = data.get("nextPageToken")
                if not page_token:
                    break
        return out

    async def list_child_folders(self, parent_id: str) -> list[dict]:
        """Immediate sub-folders of `parent_id` (or 'root'). For the folder picker."""
        if parent_id != "root" and not _FOLDER_ID_RE.match(parent_id):
            raise ValueError(f"invalid drive folder id: {parent_id!r}")
        out: list[dict] = []
        page_token: str | None = None
        while True:
            params = {
                "q": (
                    f"'{parent_id}' in parents and trashed = false "
                    "and mimeType = 'application/vnd.google-apps.folder'"
                ),
                "fields": "nextPageToken, files(id,name)",
                "orderBy": "name",
                "pageSize": 200,
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
            }
            if page_token:
                params["pageToken"] = page_token
            data = (await self._get(_DRIVE_FILES, **params)).json()
            out.extend({"id": r["id"], "name": r.get("name", r["id"])} for r in data.get("files", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                return out

    async def download(self, f: DriveFile) -> tuple[bytes, str]:
        """(bytes, extension). Raises UnsupportedFormatError for mimes the parser can't take."""
        if f.mime_type in _EXPORT_MAP:
            export_mime, ext = _EXPORT_MAP[f.mime_type]
            resp = await self._get(f"{_DRIVE_FILES}/{f.id}/export", mimeType=export_mime)
            return resp.content, ext
        if f.mime_type in _NATIVE_EXT:
            resp = await self._get(
                f"{_DRIVE_FILES}/{f.id}", alt="media", supportsAllDrives="true"
            )
            return resp.content, _NATIVE_EXT[f.mime_type]
        raise UnsupportedFormatError(f"drive mime {f.mime_type!r} not supported")


# ---------------------------------------------------------------- syncer


class DriveSyncer:
    def __init__(
        self,
        pool,
        settings: Settings | None = None,
        *,
        parser: StructuralDocumentParser | None = None,
        embedder: GeminiEmbedder | None = None,
        summarizer: GeminiStructured | None = None,
        token_store: SupabaseTokenStore | None = None,
        drive_client_factory=None,
    ) -> None:
        self._pool = pool
        self._s = settings or get_settings()
        self._parser = parser or StructuralDocumentParser()
        self._embedder = embedder or GeminiEmbedder()
        self._summarizer = summarizer  # lazily constructed on first use
        self._store = token_store or SupabaseTokenStore(pool)
        self._make_client = drive_client_factory or self._default_client

    async def _default_client(self, creds: ConnectorCredentials) -> GoogleDriveClient:
        return GoogleDriveClient(creds, self._s, token_store=self._store)

    async def sync_drive_folder(self, folder_id: str, user_id: str) -> SyncReport:
        creds = await self._store.load(user_id, "gdrive")
        report = SyncReport(
            folder_id=folder_id,
            user_id=user_id,
            workspace_id=creds.workspace_id,
            started_at=_utcnow(),
        )
        watermark = await self._load_watermark(creds.account_id, folder_id)
        high_water = watermark

        client = await self._make_client(creds)
        try:
            # One full listing: drives both the delta (what to re-parse) and
            # reconciliation (what has left the folder and must be pruned).
            all_files = await client.list_folder_tree(folder_id)
            files = [
                f for f in all_files
                if watermark is None or f.modified_time > watermark
            ]
            report.scanned = len(files)
            sem = asyncio.Semaphore(self._s.sync_max_concurrency)

            for batch in _batched(files, self._s.sync_batch_size):
                results = await asyncio.gather(
                    *(self._process_one(client, creds, f, sem) for f in batch)
                )
                for f, res in zip(batch, results):
                    report.items.append(res)
                    report.synced += res.status == "synced"
                    report.skipped += res.status == "skipped"
                    report.failed += res.status == "failed"
                    if res.status != "failed" and (
                        high_water is None or f.modified_time > high_water
                    ):
                        high_water = f.modified_time

            # Prune documents whose source file is no longer in the folder.
            # Only on a clean run so a transient listing error can't wipe the index.
            # Workspace-scoped: correct for the current one-folder-per-connector model.
            if report.failed == 0:
                report.removed = await self._reconcile(
                    creds.workspace_id, {f.id for f in all_files}
                )
        finally:
            await client.aclose()

        report.finished_at = _utcnow()
        report.watermark = high_water if report.failed == 0 else watermark
        await self._save_watermark(creds.account_id, folder_id, report)
        logger.info(
            "drive sync %s: scanned=%d synced=%d skipped=%d failed=%d removed=%d",
            folder_id,
            report.scanned,
            report.synced,
            report.skipped,
            report.failed,
            report.removed,
        )
        return report

    async def _process_one(
        self, client: GoogleDriveClient, creds: ConnectorCredentials, f: DriveFile, sem
    ) -> SyncItemResult:
        async with sem:  # strict backpressure - never more than N files in flight
            try:
                data, ext = await client.download(f)
                parsed = self._parser.parse_document(
                    data, filename=_parser_filename(f.name, ext)
                )
                if not parsed.chunks:
                    return SyncItemResult(
                        file_id=f.id,
                        name=f.name,
                        status="skipped",
                        reason="no_extractable_content",
                    )
                vectors = await self._embed_chunks(parsed.chunks)
                doc_id, written = await self._replace_document(
                    creds, f, parsed.chunks, vectors
                )
                await self._summarize_if_needed(doc_id, parsed)
                return SyncItemResult(
                    file_id=f.id, name=f.name, status="synced", chunks_written=written
                )
            except UnsupportedFormatError as exc:
                return SyncItemResult(
                    file_id=f.id, name=f.name, status="skipped", reason=str(exc)
                )
            except (DocumentParseError, httpx.HTTPError, asyncio.TimeoutError) as exc:
                logger.warning("drive file %s (%s) failed: %s", f.id, f.name, exc)
                return SyncItemResult(
                    file_id=f.id, name=f.name, status="failed", reason=str(exc)
                )

    async def _embed_chunks(self, chunks: Sequence[Chunk]) -> list[list[float]]:
        out: list[list[float]] = []
        for group in _batched(chunks, self._s.embed_batch_size):
            out.extend(await self._embedder.embed([c.text for c in group]))
        return out

    async def _replace_document(
        self,
        creds: ConnectorCredentials,
        f: DriveFile,
        chunks: Sequence[Chunk],
        vectors: Sequence[list[float]],
    ) -> tuple[str, int]:
        storage_path = f"gdrive://{f.id}"
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                doc_id = await conn.fetchval(
                    """
                    INSERT INTO documents (workspace_id, name, storage_path, file_type,
                                           size_bytes, external_id, source_type,
                                           last_modified, last_synced_at)
                    VALUES ($1,$2,$3,$4,$5,$6,'gdrive',$7, now())
                    ON CONFLICT (workspace_id, external_id) WHERE external_id IS NOT NULL
                    DO UPDATE SET name           = EXCLUDED.name,
                                  storage_path   = EXCLUDED.storage_path,
                                  file_type      = EXCLUDED.file_type,
                                  size_bytes     = EXCLUDED.size_bytes,
                                  last_modified  = EXCLUDED.last_modified,
                                  last_synced_at = now()
                    RETURNING id
                    """,
                    creds.workspace_id,
                    f.name,
                    storage_path,
                    f.mime_type,
                    f.size,
                    f.id,
                    f.modified_time,
                )
                # Atomic replace - old chunks for this external file go, new ones land,
                # all-or-nothing. No window with duplicates or orphans.
                await conn.execute(
                    "DELETE FROM document_chunks WHERE document_id = $1 AND external_id = $2",
                    doc_id,
                    f.id,
                )
                await conn.executemany(
                    """
                    INSERT INTO document_chunks
                      (document_id, content, embedding, embedding_model, external_id,
                       source_type, metadata, acl_permissions, last_modified)
                    VALUES ($1,$2,$3,$4,$5,'gdrive',$6::jsonb,'{}'::jsonb,$7)
                    """,
                    [
                        (
                            doc_id,
                            c.text,
                            v,
                            self._s.embedding_model,
                            f.id,
                            json.dumps(c.metadata.model_dump()),
                            f.modified_time,
                        )
                        for c, v in zip(chunks, vectors)
                    ],
                )
        return str(doc_id), len(chunks)

    # -- summary / reconciliation --

    async def _summarize_if_needed(self, doc_id: str, parsed) -> None:
        """Best-effort 2-sentence summary + topics, only for docs that lack one."""
        async with self._pool.acquire() as conn:
            existing = await conn.fetchval(
                "SELECT summary FROM documents WHERE id = $1", doc_id
            )
        if existing:
            return
        if self._summarizer is None:
            self._summarizer = GeminiStructured(model=self._s.summary_model)
        try:
            text = (parsed.markdown or (parsed.chunks[0].text if parsed.chunks else ""))[:8000]
            out = await self._summarizer.generate(
                system=_SUMMARY_SYS, prompt=text, schema=_SUMMARY_SCHEMA
            )
            async with self._pool.acquire() as conn:
                await conn.execute(
                    "UPDATE documents SET summary = $2, topics = $3::jsonb WHERE id = $1",
                    doc_id,
                    str(out.get("summary", ""))[:2000],
                    json.dumps(list(out.get("topics", []))[:8]),
                )
        except Exception as exc:  # noqa: BLE001 - summary is an enhancement only
            logger.warning("drive summary failed for %s: %s", doc_id, exc)

    async def _reconcile(self, workspace_id: str, current_ids: set[str]) -> int:
        """Delete gdrive documents in this workspace whose file id is no longer present.
        Chunks cascade via the documents FK."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, external_id FROM documents "
                "WHERE workspace_id = $1 AND source_type = 'gdrive' "
                "AND external_id IS NOT NULL",
                workspace_id,
            )
            stale = [r["id"] for r in rows if r["external_id"] not in current_ids]
            if stale:
                await conn.execute(
                    "DELETE FROM documents WHERE id = ANY($1::uuid[])", stale
                )
        return len(stale)

    # -- watermark --

    async def _load_watermark(self, account_id: str, folder_id: str) -> datetime | None:
        async with self._pool.acquire() as conn:
            return await conn.fetchval(
                """SELECT last_synced_at FROM drive_sync_state
                   WHERE connector_account_id = $1 AND folder_id = $2""",
                account_id,
                folder_id,
            )

    async def _save_watermark(
        self, account_id: str, folder_id: str, report: SyncReport
    ) -> None:
        status = "ok" if report.failed == 0 else "partial"
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO drive_sync_state
                  (connector_account_id, folder_id, last_synced_at, last_run_at,
                   last_status, last_report)
                VALUES ($1,$2,$3, now(), $4, $5::jsonb)
                ON CONFLICT (connector_account_id, folder_id)
                DO UPDATE SET last_synced_at = EXCLUDED.last_synced_at,
                              last_run_at    = EXCLUDED.last_run_at,
                              last_status    = EXCLUDED.last_status,
                              last_report    = EXCLUDED.last_report
                """,
                account_id,
                folder_id,
                report.watermark,
                status,
                report.model_dump_json(),
            )


# ---------------------------------------------------------------- module entry


async def sync_drive_folder(folder_id: str, user_id: str) -> SyncReport:
    """Construct a syncer from settings + the shared pool and run one folder sync."""
    from db.pool import get_pool

    return await DriveSyncer(await get_pool()).sync_drive_folder(folder_id, user_id)


# ---------------------------------------------------------------- helpers


def _batched(seq: Iterable, n: int) -> Iterator[list]:
    items = list(seq)
    step = max(1, n)
    for i in range(0, len(items), step):
        yield items[i : i + step]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_drive_file(raw: dict) -> DriveFile:
    return DriveFile(
        id=raw["id"],
        name=raw.get("name", raw["id"]),
        mime_type=raw.get("mimeType", ""),
        modified_time=_parse_rfc3339(raw.get("modifiedTime")),
        size=int(raw["size"]) if raw.get("size") is not None else None,
        parents=list(raw.get("parents", [])),
    )


def _parse_rfc3339(value: str | None) -> datetime:
    if not value:
        return datetime.fromtimestamp(0, tz=timezone.utc)
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _parser_filename(name: str, ext: str) -> str:
    return name if name.lower().endswith(ext) else f"{name}{ext}"
