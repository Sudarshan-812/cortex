"""RAGOrchestrator: hybrid retrieve -> RRF -> rerank -> CRAG -> streamed synthesis."""
from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Sequence

from core.config import Settings, get_settings
from models.chunk import ChunkMetadata
from models.retrieval import (
    Citation,
    CragChunkGrade,
    CragVerdict,
    QueryRequest,
    RankedChunk,
    RetrievedChunk,
)
from services.embeddings import GeminiEmbedder
from services.gemini import GeminiStructured
from services.synthesis import ClaudeSynthesizer

logger = logging.getLogger("cortex.retrieval")

# Same ACL gate as match_hybrid_documents (migration 0001), $2 = auth_uid.
_ACL_SQL = """(
    d.workspace_id IN (SELECT w.id FROM workspaces w WHERE w.owner_id = $2)
    OR d.workspace_id IN (SELECT m.workspace_id FROM workspace_members m WHERE m.user_id = $2)
    OR COALESCE(dc.acl_permissions->>'public', 'false') = 'true'
    OR (dc.acl_permissions -> 'users') ? $2::text
)"""

_META_KEYS = ("page_number", "headers", "is_table")


def reciprocal_rank_fusion(
    ranked_lists: Sequence[Sequence[RetrievedChunk]],
    *,
    k: int = 60,
    limit: int | None = None,
) -> list[RetrievedChunk]:
    scores: dict[str, float] = {}
    first_seen: dict[str, RetrievedChunk] = {}
    for lst in ranked_lists:
        for rank, chunk in enumerate(lst):
            scores[chunk.id] = scores.get(chunk.id, 0.0) + 1.0 / (k + rank + 1)
            first_seen.setdefault(chunk.id, chunk)
    fused = sorted(first_seen.values(), key=lambda c: scores[c.id], reverse=True)
    for c in fused:
        c.score = round(scores[c.id], 6)
    return fused if limit is None else fused[:limit]


def _row_to_chunk(r) -> RetrievedChunk:
    meta = r["metadata"]
    if isinstance(meta, str):
        meta = json.loads(meta)
    meta = {k: v for k, v in (meta or {}).items() if k in _META_KEYS}
    return RetrievedChunk(
        id=str(r["id"]),
        document_id=str(r["document_id"]),
        content=r["content"],
        metadata=ChunkMetadata(**meta),
        source_name=r["source_name"] or "Unknown",
        score=float(r["similarity"] or 0.0),
    )


class HybridRetriever:
    def __init__(self, pool, settings: Settings | None = None, *, embedder=None) -> None:
        self._pool = pool
        self._s = settings or get_settings()
        self._embedder = embedder or GeminiEmbedder()
        self._mode = self._s.retrieval_mode

    async def retrieve(
        self,
        query: str,
        auth_uid: str,
        *,
        workspace_id: str | None = None,
        limit: int = 25,
        threshold: float = 0.2,
    ) -> list[RetrievedChunk]:
        qvec = (await self._embedder.embed([query]))[0]
        if self._mode == "app":
            return await self._retrieve_app(
                qvec, query, auth_uid, workspace_id, limit, threshold
            )
        return await self._retrieve_rpc(qvec, query, auth_uid, workspace_id, limit, threshold)

    async def _retrieve_rpc(self, qvec, query, auth_uid, workspace_id, limit, threshold):
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, document_id, content, metadata, source_name, similarity "
                "FROM match_hybrid_documents($1, $2, $3, $4, $5, $6)",
                qvec,
                query,
                auth_uid,
                threshold,
                limit,
                workspace_id,
            )
        return [_row_to_chunk(r) for r in rows]

    async def _retrieve_app(self, qvec, query, auth_uid, workspace_id, limit, threshold):
        pool_n = limit * 2
        dense, lexical = await asyncio.gather(
            self._dense(qvec, auth_uid, workspace_id, pool_n, threshold),
            self._lexical(query, auth_uid, workspace_id, pool_n),
        )
        return reciprocal_rank_fusion([dense, lexical], k=60, limit=limit)

    async def _dense(self, qvec, auth_uid, workspace_id, n, threshold):
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                f"""SELECT dc.id, dc.document_id, dc.content, dc.metadata,
                           d.name AS source_name, 1 - (dc.embedding <=> $1) AS similarity
                    FROM document_chunks dc JOIN documents d ON d.id = dc.document_id
                    WHERE {_ACL_SQL} AND ($3::uuid IS NULL OR d.workspace_id = $3)
                      AND dc.embedding IS NOT NULL AND 1 - (dc.embedding <=> $1) > $4
                    ORDER BY dc.embedding <=> $1 LIMIT $5""",
                qvec,
                auth_uid,
                workspace_id,
                threshold,
                n,
            )
        return [_row_to_chunk(r) for r in rows]

    async def _lexical(self, query, auth_uid, workspace_id, n):
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                f"""SELECT dc.id, dc.document_id, dc.content, dc.metadata,
                           d.name AS source_name,
                           ts_rank_cd(to_tsvector('english', dc.content),
                                      websearch_to_tsquery('english', $1)) AS similarity
                    FROM document_chunks dc JOIN documents d ON d.id = dc.document_id
                    WHERE {_ACL_SQL} AND ($3::uuid IS NULL OR d.workspace_id = $3)
                      AND to_tsvector('english', dc.content)
                          @@ websearch_to_tsquery('english', $1)
                    ORDER BY similarity DESC LIMIT $4""",
                query,
                auth_uid,
                workspace_id,
                n,
            )
        return [_row_to_chunk(r) for r in rows]


_RERANK_SYSTEM = (
    "You are a passage reranker. Score each passage 0.0-1.0 for how directly it "
    "answers the query. Return every passage index exactly once."
)
_RERANK_SCHEMA = {
    "type": "object",
    "properties": {
        "rankings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "score": {"type": "number"},
                },
                "required": ["index", "score"],
            },
        }
    },
    "required": ["rankings"],
}


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _rerank_prompt(query: str, chunks: Sequence[RetrievedChunk]) -> str:
    body = "\n\n".join(f"[{i}] {c.content[:600]}" for i, c in enumerate(chunks))
    return f"Query: {query}\n\nPassages:\n{body}"


class Reranker:
    def __init__(
        self,
        gemini: GeminiStructured | None = None,
        *,
        settings: Settings | None = None,
        model: str | None = None,
    ) -> None:
        s = settings or get_settings()
        self._gemini = gemini or GeminiStructured(model=model or s.rerank_model)

    async def rerank(
        self, query: str, chunks: Sequence[RetrievedChunk], *, top_n: int = 5
    ) -> list[RankedChunk]:
        if not chunks:
            return []
        try:
            data = await self._gemini.generate(
                system=_RERANK_SYSTEM,
                prompt=_rerank_prompt(query, chunks),
                schema=_RERANK_SCHEMA,
                temperature=0.0,
            )
            scored = [
                (item["index"], _clamp01(float(item["score"])))
                for item in data.get("rankings", [])
                if isinstance(item.get("index"), int) and 0 <= item["index"] < len(chunks)
            ]
            if not scored:
                raise ValueError("no valid rankings")
            scored.sort(key=lambda t: t[1], reverse=True)
            ranked: list[RankedChunk] = []
            seen: set[int] = set()
            for idx, sc in scored:
                if idx in seen:
                    continue
                seen.add(idx)
                ranked.append(
                    RankedChunk(
                        **chunks[idx].model_dump(), rerank_score=sc, rank=len(ranked)
                    )
                )
                if len(ranked) >= top_n:
                    break
            return ranked
        except Exception as exc:  # noqa: BLE001
            logger.warning("rerank failed (%s); using fusion order", exc)
            return [
                RankedChunk(**c.model_dump(), rerank_score=c.score, rank=i)
                for i, c in enumerate(chunks[:top_n])
            ]


_CRAG_SYSTEM = (
    "You grade retrieved context for a RAG system. For each chunk give a "
    "relevance score 0.0-1.0 vs the user's question. If the context is weak "
    "overall, also produce one sharper standalone search query."
)
_CRAG_SCHEMA = {
    "type": "object",
    "properties": {
        "grades": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "chunk_id": {"type": "string"},
                    "relevance": {"type": "number"},
                },
                "required": ["chunk_id", "relevance"],
            },
        },
        "rewritten_query": {"type": "string"},
    },
    "required": ["grades"],
}


def _crag_prompt(query: str, ranked: Sequence[RankedChunk]) -> str:
    body = "\n\n".join(f"id={c.id}\n{c.content[:600]}" for c in ranked)
    return f"Question: {query}\n\nChunks:\n{body}"


class CragEvaluator:
    def __init__(
        self,
        gemini: GeminiStructured | None = None,
        *,
        settings: Settings | None = None,
        threshold: float | None = None,
        model: str | None = None,
    ) -> None:
        s = settings or get_settings()
        self._gemini = gemini or GeminiStructured(model=model or s.crag_model)
        self._threshold = s.crag_threshold if threshold is None else threshold

    async def evaluate(self, query: str, ranked: Sequence[RankedChunk]) -> CragVerdict:
        if not ranked:
            return CragVerdict(action="rewrite")
        try:
            data = await self._gemini.generate(
                system=_CRAG_SYSTEM,
                prompt=_crag_prompt(query, ranked),
                schema=_CRAG_SCHEMA,
                temperature=0.0,
            )
            known = {c.id for c in ranked}
            grades = [
                CragChunkGrade(
                    chunk_id=g["chunk_id"], relevance=_clamp01(float(g["relevance"]))
                )
                for g in data.get("grades", [])
                if g.get("chunk_id") in known
            ]
            mean = sum(g.relevance for g in grades) / len(grades) if grades else 0.0
            if mean >= self._threshold:
                return CragVerdict(grades=grades, mean_relevance=mean, action="answer")
            rq = (data.get("rewritten_query") or "").strip() or None
            return CragVerdict(
                grades=grades, mean_relevance=mean, action="rewrite", rewritten_query=rq
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("CRAG eval failed (%s); proceeding to answer", exc)
            return CragVerdict(mean_relevance=1.0, action="answer")


class RAGOrchestrator:
    def __init__(
        self,
        pool,
        settings: Settings | None = None,
        *,
        retriever=None,
        reranker=None,
        crag=None,
        synthesizer=None,
    ) -> None:
        self._s = settings or get_settings()
        self._retriever = retriever or HybridRetriever(pool, self._s)
        self._reranker = reranker or Reranker(settings=self._s)
        self._crag = crag or CragEvaluator(settings=self._s)
        self._synth = synthesizer or ClaudeSynthesizer(settings=self._s)

    async def run(self, request: QueryRequest, auth_uid: str) -> AsyncIterator[dict]:
        n = self._s.retrieval_candidates
        top_k = request.top_k or self._s.answer_top_k

        candidates = await self._retriever.retrieve(
            request.query, auth_uid, workspace_id=request.workspace_id, limit=n
        )
        yield {"type": "retrieval", "candidates": len(candidates)}
        if not candidates:
            yield {"type": "done", "grounded": False, "citations": []}
            return

        ranked = await self._reranker.rerank(request.query, candidates, top_n=top_k)
        verdict = await self._crag.evaluate(request.query, ranked)
        yield {
            "type": "crag",
            "mean_relevance": round(verdict.mean_relevance, 3),
            "action": verdict.action,
        }

        answer_query = request.query
        if verdict.action == "rewrite" and verdict.rewritten_query:
            answer_query = verdict.rewritten_query
            yield {"type": "rewrite", "query": answer_query}
            candidates = await self._retriever.retrieve(
                answer_query, auth_uid, workspace_id=request.workspace_id, limit=n
            )
            ranked = await self._reranker.rerank(answer_query, candidates, top_n=top_k)

        citations = [
            Citation(
                chunk_id=c.id,
                source_name=c.source_name,
                page_number=c.metadata.page_number,
            ).model_dump()
            for c in ranked
        ]
        yield {"type": "citations", "citations": citations}
        if not ranked:
            yield {"type": "done", "grounded": False, "citations": citations}
            return

        async for tok in self._synth.stream(
            answer_query, ranked, original_query=request.query
        ):
            yield {"type": "token", "text": tok}
        yield {"type": "done", "grounded": True, "citations": citations}
