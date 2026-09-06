"""ClaudeSynthesizer — streamed answer from the Anthropic API with a strict
citation contract (page_number, source_name, chunk_id come from the orchestrator's
`citations` event; Claude references chunk ids inline)."""
from __future__ import annotations

import re
from collections.abc import AsyncIterator, Sequence

from core.config import Settings, get_settings
from models.retrieval import RankedChunk

_SYSTEM = (
    "You are Cortex, a document-intelligence assistant. Answer ONLY from the "
    "numbered context blocks below. If they do not contain the answer, say so "
    "plainly — never use outside knowledge. Cite every factual claim inline with "
    "the block's id in square brackets, e.g. [a1b2c3d4]. Never invent an id. "
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
        head = f"[id {c.id} | {c.source_name}{page}]"
        out.append(f"\n{head}{(' ' + hdr) if hdr else ''}\n{c.content}")
    return "\n".join(out)


class ClaudeSynthesizer:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        api_key: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        client=None,
    ) -> None:
        s = settings or get_settings()
        self._model = model or s.synthesis_model
        self._max_tokens = max_tokens or s.synthesis_max_tokens
        self._api_key = api_key or s.anthropic_api_key
        self._client = client

    def _get_client(self):
        if self._client is None:
            from anthropic import AsyncAnthropic

            self._client = AsyncAnthropic(api_key=self._api_key or None)
        return self._client

    async def stream(
        self,
        query: str,
        ranked: Sequence[RankedChunk],
        *,
        original_query: str | None = None,
    ) -> AsyncIterator[str]:
        user = f"{_format_context(ranked)}\n\nQuestion: {original_query or query}"
        if original_query and original_query != query:
            user += f"\n(Interpretation used for retrieval: {query})"
        async with self._get_client().messages.stream(
            model=self._model,
            max_tokens=self._max_tokens,
            system=_SYSTEM,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
