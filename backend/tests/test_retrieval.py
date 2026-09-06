"""Part-4 unit tests — RRF math, rerank + CRAG fallbacks, orchestrator event
flow, citation parsing. Live DB / Claude / Gemini calls are Part 5."""
from __future__ import annotations

import pytest

from models.chunk import ChunkMetadata
from models.retrieval import CragVerdict, QueryRequest, RankedChunk, RetrievedChunk
from services.retrieval import (
    CragEvaluator,
    RAGOrchestrator,
    Reranker,
    reciprocal_rank_fusion,
)
from services.synthesis import cited_ids


def _rc(cid: str, score: float = 0.0, page: int = 1) -> RetrievedChunk:
    return RetrievedChunk(
        id=cid,
        document_id="d1",
        content=f"content {cid}",
        metadata=ChunkMetadata(page_number=page),
        source_name="doc.pdf",
        score=score,
    )


class FakeGemini:
    def __init__(self, payload=None, exc: Exception | None = None) -> None:
        self._payload, self._exc = payload, exc
        self.calls: list[str] = []

    async def generate(self, *, system, prompt, schema, temperature=0.0):
        self.calls.append(prompt)
        if self._exc:
            raise self._exc
        return self._payload


# ---- RRF ----


def test_rrf_fuses_by_reciprocal_rank():
    a = [_rc("x"), _rc("y"), _rc("z")]
    b = [_rc("y"), _rc("x")]
    fused = reciprocal_rank_fusion([a, b], k=60)
    assert [c.id for c in fused] == ["x", "y", "z"]
    # RRF rounds published scores to 6 dp.
    assert fused[0].score == pytest.approx(1 / 61 + 1 / 62, abs=1e-6)
    assert fused[2].score == pytest.approx(1 / 63, abs=1e-6)


def test_rrf_limit_and_empty():
    assert reciprocal_rank_fusion([[]], k=60) == []
    lst = [_rc(str(i)) for i in range(10)]
    assert len(reciprocal_rank_fusion([lst], k=60, limit=3)) == 3


# ---- reranker ----


@pytest.mark.asyncio
async def test_reranker_orders_and_caps_top_n():
    chunks = [_rc("a"), _rc("b"), _rc("c"), _rc("d")]
    g = FakeGemini(
        {
            "rankings": [
                {"index": 0, "score": 0.2},
                {"index": 1, "score": 0.9},
                {"index": 2, "score": 0.5},
                {"index": 3, "score": 0.7},
            ]
        }
    )
    out = await Reranker(g).rerank("q", chunks, top_n=2)
    assert [c.id for c in out] == ["b", "d"]
    assert [c.rank for c in out] == [0, 1]
    assert out[0].rerank_score == 0.9


@pytest.mark.asyncio
async def test_reranker_falls_back_to_fusion_order():
    chunks = [_rc("a", score=0.3), _rc("b", score=0.1)]
    out = await Reranker(FakeGemini(exc=RuntimeError("boom"))).rerank("q", chunks, top_n=5)
    assert [c.id for c in out] == ["a", "b"]
    assert out[0].rerank_score == 0.3


@pytest.mark.asyncio
async def test_reranker_ignores_out_of_range_index():
    g = FakeGemini({"rankings": [{"index": 9, "score": 1.0}, {"index": 1, "score": 0.4}]})
    out = await Reranker(g).rerank("q", [_rc("a"), _rc("b")], top_n=5)
    assert [c.id for c in out] == ["b"]


# ---- CRAG ----


def _ranked(cid: str) -> RankedChunk:
    return RankedChunk(**_rc(cid).model_dump(), rerank_score=1.0, rank=0)


@pytest.mark.asyncio
async def test_crag_answer_when_relevance_high():
    g = FakeGemini(
        {
            "grades": [
                {"chunk_id": "a", "relevance": 0.8},
                {"chunk_id": "b", "relevance": 0.7},
            ],
            "rewritten_query": "ignored",
        }
    )
    v = await CragEvaluator(g, threshold=0.65).evaluate("q", [_ranked("a"), _ranked("b")])
    assert v.action == "answer" and v.rewritten_query is None
    assert v.mean_relevance == pytest.approx(0.75)


@pytest.mark.asyncio
async def test_crag_rewrite_when_relevance_low():
    g = FakeGemini(
        {"grades": [{"chunk_id": "a", "relevance": 0.2}], "rewritten_query": "better query"}
    )
    v = await CragEvaluator(g, threshold=0.65).evaluate("q", [_ranked("a")])
    assert v.action == "rewrite" and v.rewritten_query == "better query"


@pytest.mark.asyncio
async def test_crag_fails_open_to_answer():
    v = await CragEvaluator(FakeGemini(exc=RuntimeError("x")), threshold=0.65).evaluate(
        "q", [_ranked("a")]
    )
    assert v.action == "answer"


# ---- orchestrator ----


class FakeRetriever:
    def __init__(self, results: list[list[RetrievedChunk]]) -> None:
        self._results = results
        self.calls: list[str] = []

    async def retrieve(self, query, auth_uid, *, workspace_id=None, limit=25):
        self.calls.append(query)
        return list(self._results[min(len(self.calls) - 1, len(self._results) - 1)])


class FakeReranker:
    async def rerank(self, query, chunks, *, top_n=5):
        return [
            RankedChunk(**c.model_dump(), rerank_score=c.score, rank=i)
            for i, c in enumerate(chunks[:top_n])
        ]


class FakeCrag:
    def __init__(self, verdict: CragVerdict | None) -> None:
        self._v = verdict

    async def evaluate(self, query, ranked):
        return self._v


class FakeSynth:
    def __init__(self) -> None:
        self.seen: list[str] = []

    async def stream(self, query, ranked, *, original_query=None):
        self.seen.append(query)
        for t in ("Ans", "wer"):
            yield t


def _settings():
    from core.config import Settings

    return Settings(retrieval_candidates=25, answer_top_k=5, crag_threshold=0.65)


async def _collect(agen):
    return [e async for e in agen]


@pytest.mark.asyncio
async def test_orchestrator_happy_path_no_rewrite():
    retr = FakeRetriever([[_rc("a"), _rc("b")]])
    synth = FakeSynth()
    orch = RAGOrchestrator(
        None,
        _settings(),
        retriever=retr,
        reranker=FakeReranker(),
        crag=FakeCrag(CragVerdict(mean_relevance=0.9, action="answer")),
        synthesizer=synth,
    )
    evts = await _collect(orch.run(QueryRequest(query="hi"), "user-1"))
    assert [e["type"] for e in evts] == [
        "retrieval",
        "crag",
        "citations",
        "token",
        "token",
        "done",
    ]
    assert evts[-1]["grounded"] is True
    assert retr.calls == ["hi"] and synth.seen == ["hi"]


@pytest.mark.asyncio
async def test_orchestrator_rewrite_reretrieves():
    retr = FakeRetriever([[_rc("a")], [_rc("b"), _rc("c")]])
    synth = FakeSynth()
    orch = RAGOrchestrator(
        None,
        _settings(),
        retriever=retr,
        reranker=FakeReranker(),
        crag=FakeCrag(
            CragVerdict(mean_relevance=0.2, action="rewrite", rewritten_query="sharper")
        ),
        synthesizer=synth,
    )
    evts = await _collect(orch.run(QueryRequest(query="vague"), "user-1"))
    assert [e["type"] for e in evts] == [
        "retrieval",
        "crag",
        "rewrite",
        "citations",
        "token",
        "token",
        "done",
    ]
    assert retr.calls == ["vague", "sharper"] and synth.seen == ["sharper"]


@pytest.mark.asyncio
async def test_orchestrator_no_candidates_short_circuits():
    synth = FakeSynth()
    orch = RAGOrchestrator(
        None,
        _settings(),
        retriever=FakeRetriever([[]]),
        reranker=FakeReranker(),
        crag=FakeCrag(None),
        synthesizer=synth,
    )
    evts = await _collect(orch.run(QueryRequest(query="x"), "u"))
    assert [e["type"] for e in evts] == ["retrieval", "done"]
    assert evts[-1]["grounded"] is False and synth.seen == []


def test_cited_ids_extracts_bracketed_ids():
    text = "Revenue rose [a1b2c3d4] but margin fell [ff00aa11-2233]. Not [x]."
    assert cited_ids(text) == {"a1b2c3d4", "ff00aa11-2233"}
