"""GeminiSynthesizer - streamed answer from the Gemini API (free tier) with a
strict citation contract. Same model the Next.js app uses for its chat stream.

The authoritative citation list (chunk_id / source_name / page_number) is emitted
by the orchestrator's `citations` event; the model only references chunk ids
inline as [id], and `cited_ids()` can post-validate them.
"""
from __future__ import annotations

import asyncio
import json
import re
from collections.abc import AsyncIterator, Sequence

import httpx

from core.config import Settings, get_settings
from core.retry import ApiError, _retry_after, _safe_error_message
from models.retrieval import RankedChunk

_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
_RETRYABLE = frozenset({429, 500, 502, 503, 504})

_SYSTEM = (
    "You are Cortex, a document-intelligence assistant. Answer ONLY from the "
    "numbered context blocks below. If they do not contain the answer, say so "
    "plainly - never use outside knowledge. Each block starts with an id already "
    "wrapped in brackets, e.g. [a1b2c3d4-...]. To cite a claim, copy that bracketed "
    "token exactly, character for character - do not add words like 'id' inside "
    "the brackets, do not shorten or alter the id, and never put more than one id "
    "in a single bracket. If a claim is supported by several blocks, place their "
    "bracketed ids one after another, e.g. [id1][id2]. Never invent an id. "
    "Be concise and specific."
)
_CITE_RE = re.compile(r"\[([0-9a-fA-F][0-9a-fA-F-]{7,})\]")


def cited_ids(text: str) -> set[str]:
    return set(_CITE_RE.findall(text))


def _format_context(ranked: Sequence[RankedChunk]) -> str:
    out = ["Context blocks:"]
    for c in ranked:
        page = f", p.{c.metadata.page_number}" if c.metadata.page_number else ""
        hdr = " > ".join(c.metadata.headers) if c.metadata.headers else ""
        source = f"Source: {c.source_name}{page}{(' - ' + hdr) if hdr else ''}"
        out.append(f"\n[{c.id}] {source}\n{c.content}")
    return "\n".join(out)


def _parse_sse_line(line: str) -> list[str]:
    if not line.startswith("data:"):
        return []
    payload = line[5:].strip()
    if not payload or payload == "[DONE]":
        return []
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return []
    return [
        part["text"]
        for cand in data.get("candidates", [])
        for part in cand.get("content", {}).get("parts", [])
        if part.get("text")
    ]


class GeminiSynthesizer:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        api_key: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        s = settings or get_settings()
        self._model = model or s.synthesis_model
        self._max_tokens = max_tokens or s.synthesis_max_tokens
        self._key = api_key or s.gemini_api_key
        self._retries = s.http_max_retries
        self._client = client or httpx.AsyncClient(timeout=60)
        self._owns_client = client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    def _body(self, query: str, ranked: Sequence[RankedChunk], original_query: str | None) -> dict:
        user = f"{_format_context(ranked)}\n\nQuestion: {original_query or query}"
        if original_query and original_query != query:
            user += f"\n(Interpretation used for retrieval: {query})"
        return {
            "systemInstruction": {"parts": [{"text": _SYSTEM}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": self._max_tokens},
        }

    async def stream(
        self,
        query: str,
        ranked: Sequence[RankedChunk],
        *,
        original_query: str | None = None,
    ) -> AsyncIterator[str]:
        body = self._body(query, ranked, original_query)
        url = _URL.format(model=self._model)
        for attempt in range(self._retries + 1):
            started = False
            try:
                async with self._client.stream(
                    "POST", url, params={"key": self._key, "alt": "sse"}, json=body
                ) as resp:
                    if resp.status_code >= 400:
                        # Read the body before the context manager closes so
                        # _safe_error_message can pull Gemini's error detail.
                        await resp.aread()
                        retryable = resp.status_code in _RETRYABLE
                        if not retryable or attempt == self._retries:
                            raise ApiError(_safe_error_message(resp))
                        await asyncio.sleep(max(0.5 * (2**attempt), _retry_after(resp)))
                        continue
                    async for line in resp.aiter_lines():
                        for text in _parse_sse_line(line):
                            started = True
                            yield text
                return
            except httpx.TransportError:
                if started or attempt == self._retries:
                    raise
                await asyncio.sleep(0.5 * (2**attempt))
