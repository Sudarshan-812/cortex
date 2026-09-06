"""GeminiStructured — :generateContent with a JSON responseSchema.

Powers the reranker and the CRAG grader. Cohere Rerank has no free production
tier (trial keys are rate-limited / non-production), so the free-tier path is a
Gemini flash-lite model doing cross-encoder-style scoring.
"""
from __future__ import annotations

import json

import httpx

from core.config import get_settings
from core.retry import request_with_retry

_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiStructured:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        client: httpx.AsyncClient | None = None,
        max_retries: int | None = None,
    ) -> None:
        s = get_settings()
        self._key = api_key or s.gemini_api_key
        self._model = model or s.rerank_model
        self._retries = s.http_max_retries if max_retries is None else max_retries
        self._client = client or httpx.AsyncClient(timeout=30)
        self._owns_client = client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def generate(
        self, *, system: str | None, prompt: str, schema: dict, temperature: float = 0.0
    ) -> dict:
        body: dict = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
                "temperature": temperature,
            },
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        resp = await request_with_retry(
            lambda: self._client.post(
                _URL.format(model=self._model), params={"key": self._key}, json=body
            ),
            max_retries=self._retries,
        )
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
