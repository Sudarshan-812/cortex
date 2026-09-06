"""IngestService - signed-URL download -> docling parse -> embed -> atomic chunk write."""
from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Sequence

import httpx

from core.config import Settings, get_settings
from core.retry import request_with_retry
from models.chunk import Chunk
from services.embeddings import GeminiEmbedder
from services.gemini import GeminiStructured
from services.parser import DocumentParseError, StructuralDocumentParser, UnsupportedFormatError

logger = logging.getLogger("cortex.ingest")

_SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "topics": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "topics"],
}


def _batched(seq: Sequence, n: int):
    for i in range(0, len(seq), max(1, n)):
        yield seq[i : i + n]


class IngestService:
    def __init__(
        self,
        pool,
        settings: Settings | None = None,
        *,
        parser: StructuralDocumentParser | None = None,
        embedder: GeminiEmbedder | None = None,
        summarizer: GeminiStructured | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._pool = pool
        self._s = settings or get_settings()
        self._parser = parser or StructuralDocumentParser()
        self._embedder = embedder or GeminiEmbedder()
        self._summarizer = summarizer or GeminiStructured(model=self._s.summary_model)
        self._http = http_client or httpx.AsyncClient(timeout=120, follow_redirects=True)
        self._owns_http = http_client is None

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    async def ingest(
        self, *, document_id: str, source_url: str, filename: str, workspace_id: str
    ) -> AsyncIterator[dict]:
        yield {"stage": "processing", "pct": 8, "label": "Downloading file…"}
        resp = await request_with_retry(
            lambda: self._http.get(source_url), max_retries=self._s.http_max_retries
        )
        data = resp.content

        yield {"stage": "processing", "pct": 18, "label": "Extracting structure…"}
        try:
            parsed = await asyncio.to_thread(
                self._parser.parse_document, data, filename=filename
            )
        except (UnsupportedFormatError, DocumentParseError) as exc:
            yield {"stage": "error", "message": str(exc)}
            return
        if not parsed.chunks:
            yield {"stage": "error", "message": "No extractable content in this file."}
            return

        total = len(parsed.chunks)
        vectors: list[list[float]] = []
        for group in _batched(parsed.chunks, self._s.embed_batch_size):
            vectors.extend(await self._embedder.embed([c.text for c in group]))
            pct = 30 + round(len(vectors) / total * 55)
            yield {
                "stage": "embedding",
                "pct": pct,
                "label": f"Embedding {len(vectors)}/{total}",
                "chunk": len(vectors),
                "total": total,
            }

        yield {"stage": "embedding", "pct": 90, "label": "Indexing vectors…"}
        written = await self._write_chunks(document_id, parsed.chunks, vectors)

        await self._summarize(document_id, parsed.markdown or parsed.chunks[0].text)

        yield {
            "stage": "done",
            "pct": 100,
            "label": "Indexed",
            "document_id": document_id,
            "chunks": written,
            "pages": parsed.page_count,
        }

    async def _write_chunks(
        self, document_id: str, chunks: Sequence[Chunk], vectors: Sequence[list[float]]
    ) -> int:
        rows = [
            (
                document_id,
                c.text,
                v,
                self._s.embedding_model,
                json.dumps(c.metadata.model_dump()),
            )
            for c, v in zip(chunks, vectors)
        ]
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                # atomic replace - re-ingest of the same document leaves no orphans
                await conn.execute(
                    "DELETE FROM document_chunks "
                    "WHERE document_id = $1 AND external_id IS NULL",
                    document_id,
                )
                await conn.executemany(
                    """
                    INSERT INTO document_chunks
                      (document_id, content, embedding, embedding_model,
                       source_type, metadata, acl_permissions, last_modified)
                    VALUES ($1,$2,$3,$4,'upload',$5::jsonb,'{}'::jsonb, now())
                    """,
                    rows,
                )
                await conn.execute(
                    "UPDATE documents SET source_type = 'upload', last_synced_at = now() "
                    "WHERE id = $1",
                    document_id,
                )
        return len(rows)

    async def _summarize(self, document_id: str, text: str) -> None:
        try:
            out = await self._summarizer.generate(
                system="Summarize the document in 2 sentences, then list exactly 5 key topics.",
                prompt=text[:8000],
                schema=_SUMMARY_SCHEMA,
            )
            async with self._pool.acquire() as conn:
                await conn.execute(
                    "UPDATE documents SET summary = $2, topics = $3::jsonb WHERE id = $1",
                    document_id,
                    str(out.get("summary", ""))[:2000],
                    json.dumps(list(out.get("topics", []))[:8]),
                )
        except Exception as exc:  # noqa: BLE001 - summary is best-effort
            logger.warning("summary failed for %s: %s", document_id, exc)
