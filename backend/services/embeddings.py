"""GeminiEmbedder - gemini-embedding-001 truncated to `dim`.
Byte-compatible with the Next.js ingest path (same model, same 768-slice)."""
from __future__ import annotations

import asyncio

import httpx

from core.config import get_settings
from core.retry import request_with_retry

_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"


class GeminiEmbedder:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        dim: int | None = None,
        max_concurrency: int | None = None,
        max_retries: int | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        s = get_settings()
        self._key = api_key or s.gemini_api_key
        self._model = model or s.embedding_model
        self._dim = dim or s.embedding_dim
        self._retries = s.http_max_retries if max_retries is None else max_retries
        self._sem = asyncio.Semaphore(max_concurrency or s.embed_max_concurrency)
        self._client = client or httpx.AsyncClient(timeout=30)
        self._owns_client = client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return list(await asyncio.gather(*(self._embed_one(t) for t in texts)))

    async def _embed_one(self, text: str) -> list[float]:
        payload = {
            "model": f"models/{self._model}",
            "content": {"parts": [{"text": text[:8000]}]},
        }
        async with self._sem:
            resp = await request_with_retry(
                lambda: self._client.post(
                    _URL.format(model=self._model),
                    params={"key": self._key},
                    json=payload,
                ),
                max_retries=self._retries,
            )
        values = resp.json()["embedding"]["values"]
        return [float(x) for x in values[: self._dim]]
