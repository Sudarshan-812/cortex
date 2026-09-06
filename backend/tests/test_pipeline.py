"""Part-5 integration harness — mocked Drive feeds + in-memory Supabase (FakeDB).

Three brief-mandated guarantees, exercised end-to-end through the real
DriveSyncer / HybridRetriever / RAGOrchestrator code paths:

  A. Atomic cleanup on file updates — no duplicate / orphaned chunks; a mid-write
     failure rolls the whole replace back.
  B. Non-leaking ACL pre-filter across user ids — owner / member / explicit grant
     / public / stranger, identical under rpc and app retrieval modes.
  C. Graceful fallback when the reranker or external APIs are rate-limited.
"""
from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest

from core.config import Settings
from integrations.gdrive import DriveSyncer, GoogleDriveClient, SupabaseTokenStore
from models.chunk import ChunkMetadata
from models.retrieval import QueryRequest, RankedChunk, RetrievedChunk
from services.gemini import GeminiStructured
from services.retrieval import CragEvaluator, HybridRetriever, RAGOrchestrator, Reranker
from tests._fakes import (
    FakeDB,
    FakeDriveTransport,
    FakeEmbedder,
    FakeParser,
    FakePool,
    drive_file,
    rate_limited_client,
)

UTC = timezone.utc


def _settings(**over) -> Settings:
    base = dict(
        retrieval_mode="rpc",
        retrieval_candidates=25,
        answer_top_k=5,
        crag_threshold=0.65,
        http_max_retries=5,
        sync_max_concurrency=4,
        sync_batch_size=25,
        embed_batch_size=16,
    )
    base.update(over)
    return Settings(**base)


def _rc(cid: str, relevance: float = 0.5) -> RetrievedChunk:
    return RetrievedChunk(
        id=cid,
        document_id="d1",
        content=f"content {cid}",
        metadata=ChunkMetadata(),
        source_name="doc.pdf",
        score=relevance,
    )


def _drive_factory(transport: FakeDriveTransport, settings: Settings, store):
    async def factory(creds):
        gc = GoogleDriveClient(
            creds,
            settings,
            token_store=store,
            client=httpx.AsyncClient(transport=httpx.MockTransport(transport), timeout=5),
        )
        gc._owns_client = True  # let DriveSyncer close it in its finally
        return gc
    return factory


def _syncer(db: FakeDB, transport: FakeDriveTransport, parser: FakeParser, settings: Settings):
    store = SupabaseTokenStore(FakePool(db))
    return DriveSyncer(
        FakePool(db),
        settings,
        parser=parser,
        embedder=FakeEmbedder(),
        token_store=store,
        drive_client_factory=_drive_factory(transport, settings, store),
    )


class _FakeSynth:
    def __init__(self) -> None:
        self.seen: list[str] = []

    async def stream(self, query, ranked, *, original_query=None):
        self.seen.append(query)
        for tok in ("Ans", "wer"):
            yield tok


# ==================================================================== A

@pytest.mark.asyncio
async def test_pipeline_sync_replaces_chunks_no_orphans(no_backoff):
    db = FakeDB()
    ws = db.add_workspace("user-A", "ws-A")
    db.add_connector("user-A", ws)
    s = _settings()

    r1 = await _syncer(
        db,
        FakeDriveTransport([drive_file("file1", "2024-01-01T00:00:00Z")]),
        FakeParser(k=3),
        s,
    ).sync_drive_folder("folder-1", "user-A")
    assert r1.synced == 1
    assert len(db.chunks) == 3

    # file1 edited in Drive (newer modifiedTime) -> 2 chunks; replace, not append.
    r2 = await _syncer(
        db,
        FakeDriveTransport([drive_file("file1", "2024-01-02T00:00:00Z")]),
        FakeParser(k=2),
        s,
    ).sync_drive_folder("folder-1", "user-A")
    assert r2.synced == 1
    assert len(db.chunks) == 2
    assert {c["external_id"] for c in db.chunks} == {"file1"}
    assert len(db.documents) == 1  # upsert on (workspace_id, external_id)


@pytest.mark.asyncio
async def test_pipeline_sync_rolls_back_on_write_failure(no_backoff):
    db = FakeDB()
    ws = db.add_workspace("user-A", "ws-A")
    db.add_connector("user-A", ws)
    s = _settings()

    await _syncer(
        db,
        FakeDriveTransport([drive_file("file1", "2024-01-01T00:00:00Z")]),
        FakeParser(k=3),
        s,
    ).sync_drive_folder("folder-1", "user-A")
    original_ids = {c["id"] for c in db.chunks}
    assert len(original_ids) == 3

    db.raise_on_executemany = True  # fail during the chunk INSERT, inside the txn
    with pytest.raises(RuntimeError):
        await _syncer(
            db,
            FakeDriveTransport([drive_file("file1", "2024-01-02T00:00:00Z")]),
            FakeParser(k=2),
            s,
        ).sync_drive_folder("folder-1", "user-A")

    # transaction restored the pre-DELETE snapshot: same 3 chunks, no partial write
    assert {c["id"] for c in db.chunks} == original_ids
    # watermark never advanced past the first run (save is after the failing gather)
    assert db.sync_state[("acct-1", "folder-1")]["last_synced_at"] == datetime(
        2024, 1, 1, tzinfo=UTC
    )


# ==================================================================== B


def _retriever(db: FakeDB, mode: str = "rpc") -> HybridRetriever:
    return HybridRetriever(FakePool(db), _settings(retrieval_mode=mode), embedder=FakeEmbedder())


@pytest.mark.parametrize("mode", ["rpc", "app"])
@pytest.mark.asyncio
async def test_pipeline_acl_isolation_across_users(mode):
    db = FakeDB()
    ws_a = db.add_workspace("U_A", "ws-A")
    ws_b = db.add_workspace("U_B", "ws-B")
    d_a = db.add_document(ws_a, name="A.pdf")
    d_b = db.add_document(ws_b, name="B.pdf")
    c_priv_a = db.add_chunk(d_a, "A private", relevance=0.9)
    c_grant = db.add_chunk(d_a, "A shared with B", acl={"users": ["U_B"]}, relevance=0.8)
    c_pub = db.add_chunk(d_a, "A public", acl={"public": True}, relevance=0.7)
    c_priv_b = db.add_chunk(d_b, "B private", relevance=0.6)

    seen_a = {c.id for c in await _retriever(db, mode).retrieve("q", "U_A")}
    seen_b = {c.id for c in await _retriever(db, mode).retrieve("q", "U_B")}
    seen_c = {c.id for c in await _retriever(db, mode).retrieve("q", "U_C")}

    assert seen_a == {c_priv_a, c_grant, c_pub}
    assert c_priv_b not in seen_a
    assert seen_b == {c_priv_b, c_grant, c_pub}
    assert c_priv_a not in seen_b
    assert seen_c == {c_pub}


@pytest.mark.parametrize("mode", ["rpc", "app"])
@pytest.mark.asyncio
async def test_pipeline_acl_workspace_member_sees_shared_workspace(mode):
    db = FakeDB()
    ws = db.add_workspace("U_owner", "ws-A")
    db.add_member(ws, "U_member")
    d = db.add_document(ws, name="A.pdf")
    c1 = db.add_chunk(d, "team doc", relevance=0.9)

    assert {c.id for c in await _retriever(db, mode).retrieve("q", "U_member")} == {c1}
    assert {c.id for c in await _retriever(db, mode).retrieve("q", "U_stranger")} == set()


@pytest.mark.asyncio
async def test_pipeline_acl_workspace_filter_scopes_results():
    db = FakeDB()
    ws1 = db.add_workspace("U", "ws-1")
    ws2 = db.add_workspace("U", "ws-2")
    a = db.add_chunk(db.add_document(ws1, name="1.pdf"), "one")
    b = db.add_chunk(db.add_document(ws2, name="2.pdf"), "two")

    assert {c.id for c in await _retriever(db).retrieve("q", "U")} == {a, b}
    assert {c.id for c in await _retriever(db).retrieve("q", "U", workspace_id="ws-1")} == {a}


# ==================================================================== C


@pytest.mark.asyncio
async def test_pipeline_reranker_rate_limited_falls_back_to_fusion_order(no_backoff):
    chunks = [_rc("a", 0.3), _rc("b", 0.2), _rc("c", 0.1)]
    reranker = Reranker(GeminiStructured(client=rate_limited_client(), max_retries=2))
    out = await reranker.rerank("q", chunks, top_n=2)
    assert [c.id for c in out] == ["a", "b"]
    assert out[0].rerank_score == 0.3  # carried from fusion score


@pytest.mark.asyncio
async def test_pipeline_crag_rate_limited_fails_open_to_answer(no_backoff):
    ranked = [RankedChunk(**_rc("a").model_dump(), rerank_score=1.0, rank=0)]
    verdict = await CragEvaluator(
        GeminiStructured(client=rate_limited_client(), max_retries=2), threshold=0.65
    ).evaluate("q", ranked)
    assert verdict.action == "answer"


@pytest.mark.asyncio
async def test_pipeline_embedder_rate_limit_propagates(no_backoff):
    from services.embeddings import GeminiEmbedder

    emb = GeminiEmbedder(client=rate_limited_client(), max_retries=2)
    with pytest.raises(httpx.HTTPStatusError):
        await emb.embed(["hello"])  # essential dependency — must NOT be swallowed


@pytest.mark.asyncio
async def test_pipeline_orchestrator_completes_when_aux_models_rate_limited(no_backoff):
    db = FakeDB()
    ws = db.add_workspace("U", "ws-1")
    d = db.add_document(ws, name="A.pdf")
    db.add_chunk(d, "the answer is 42", relevance=0.9)
    db.add_chunk(d, "supporting context", relevance=0.8)
    s = _settings()

    orch = RAGOrchestrator(
        FakePool(db),
        s,
        retriever=HybridRetriever(FakePool(db), s, embedder=FakeEmbedder()),
        reranker=Reranker(GeminiStructured(client=rate_limited_client(), max_retries=1)),
        crag=CragEvaluator(
            GeminiStructured(client=rate_limited_client(), max_retries=1), threshold=0.65
        ),
        synthesizer=_FakeSynth(),
    )
    evts = [
        e
        async for e in orch.run(
            QueryRequest(query="what is the answer", workspace_id="ws-1"), "U"
        )
    ]
    assert [e["type"] for e in evts] == [
        "retrieval",
        "crag",
        "citations",
        "token",
        "token",
        "done",
    ]
    assert next(e for e in evts if e["type"] == "crag")["action"] == "answer"
    assert next(e for e in evts if e["type"] == "citations")["citations"].__len__() == 2
    assert evts[-1]["grounded"] is True


@pytest.mark.asyncio
async def test_pipeline_drive_list_429_recovers(no_backoff):
    db = FakeDB()
    ws = db.add_workspace("U_A", "ws-A")
    db.add_connector("U_A", ws)
    s = _settings()

    report = await _syncer(
        db,
        FakeDriveTransport([drive_file("file1", "2024-01-01T00:00:00Z")], list_429=2),
        FakeParser(k=2),
        s,
    ).sync_drive_folder("folder-1", "U_A")
    assert report.synced == 1
    assert len(db.chunks) == 2


@pytest.mark.asyncio
async def test_pipeline_drive_download_429_isolates_file_and_holds_watermark(no_backoff):
    db = FakeDB()
    ws = db.add_workspace("U_A", "ws-A")
    db.add_connector("U_A", ws)
    s = _settings()
    files = [
        drive_file("ok1", "2024-01-01T00:00:00Z"),
        drive_file("bad", "2024-01-02T00:00:00Z"),
        drive_file("ok2", "2024-01-03T00:00:00Z"),
    ]

    report = await _syncer(
        db, FakeDriveTransport(files, fail_downloads={"bad"}), FakeParser(k=1), s
    ).sync_drive_folder("folder-1", "U_A")

    assert (report.synced, report.failed) == (2, 1)
    assert len(db.chunks) == 2
    # a failure in the run holds the watermark at its prior value (None here)
    assert db.sync_state[("acct-1", "folder-1")]["last_synced_at"] is None
