"""W1 - /v1/ingest service + require_user dependency (mocked Storage + FakeDB)."""
from __future__ import annotations

import httpx
import pytest

from core.config import Settings
from services.ingest import IngestService
from tests._fakes import FakeDB, FakeEmbedder, FakeParser, FakePool


class FakeSummarizer:
    def __init__(self, payload=None, exc: Exception | None = None) -> None:
        self.payload = payload or {"summary": "A doc.", "topics": ["a", "b"]}
        self.exc = exc

    async def generate(self, *, system, prompt, schema):
        if self.exc:
            raise self.exc
        return self.payload


def _file_client(content: bytes = b"%PDF-1.4 fake") -> httpx.AsyncClient:
    def handler(request):
        return httpx.Response(200, content=content, request=request)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _svc(db: FakeDB, *, parser: FakeParser | None = None, summarizer=None) -> IngestService:
    return IngestService(
        FakePool(db),
        Settings(embed_batch_size=16, http_max_retries=2),
        parser=parser or FakeParser(k=3),
        embedder=FakeEmbedder(),
        summarizer=summarizer or FakeSummarizer(),
        http_client=_file_client(),
    )


async def _collect(agen):
    return [e async for e in agen]


def _seed(db: FakeDB, name="a.pdf"):
    ws = db.add_workspace("U", "ws-1")
    return ws, db.add_document(ws, name=name)


@pytest.mark.asyncio
async def test_ingest_sse_stage_sequence():
    db = FakeDB()
    ws, doc = _seed(db)
    evts = await _collect(
        _svc(db).ingest(document_id=doc, source_url="https://x/f", filename="a.pdf", workspace_id=ws)
    )
    stages = [e["stage"] for e in evts]
    assert stages[0] == "processing" and stages[-1] == "done"
    assert "embedding" in stages
    assert evts[-1]["chunks"] == 3 and evts[-1]["document_id"] == doc


@pytest.mark.asyncio
async def test_ingest_writes_upload_chunks():
    db = FakeDB()
    ws, doc = _seed(db)
    await _collect(
        _svc(db).ingest(document_id=doc, source_url="https://x/f", filename="a.pdf", workspace_id=ws)
    )
    mine = [c for c in db.chunks if c["document_id"] == doc]
    assert len(mine) == 3
    assert all(c["external_id"] is None for c in mine)


@pytest.mark.asyncio
async def test_ingest_reingest_replaces_no_orphans():
    db = FakeDB()
    ws, doc = _seed(db)
    await _collect(
        _svc(db, parser=FakeParser(k=3)).ingest(
            document_id=doc, source_url="https://x/f", filename="a.pdf", workspace_id=ws
        )
    )
    assert len([c for c in db.chunks if c["document_id"] == doc]) == 3
    await _collect(
        _svc(db, parser=FakeParser(k=2)).ingest(
            document_id=doc, source_url="https://x/f", filename="a.pdf", workspace_id=ws
        )
    )
    assert len([c for c in db.chunks if c["document_id"] == doc]) == 2
    assert all(c["external_id"] is None for c in db.chunks)


@pytest.mark.asyncio
async def test_ingest_empty_parse_errors():
    db = FakeDB()
    ws, doc = _seed(db)
    evts = await _collect(
        _svc(db, parser=FakeParser(k=0)).ingest(
            document_id=doc, source_url="https://x/f", filename="a.pdf", workspace_id=ws
        )
    )
    assert evts[-1]["stage"] == "error"
    assert db.chunks == []


@pytest.mark.asyncio
async def test_ingest_parse_error_no_partial_write():
    db = FakeDB()
    ws, doc = _seed(db, name="bad.pdf")
    evts = await _collect(
        _svc(db, parser=FakeParser(fail_ids={"bad"})).ingest(
            document_id=doc, source_url="https://x/f", filename="bad.pdf", workspace_id=ws
        )
    )
    assert any(e["stage"] == "error" for e in evts)
    assert db.chunks == []


@pytest.mark.asyncio
async def test_ingest_writes_summary():
    db = FakeDB()
    ws, doc = _seed(db)
    await _collect(
        _svc(db, summarizer=FakeSummarizer({"summary": "S.", "topics": ["t1", "t2"]})).ingest(
            document_id=doc, source_url="https://x/f", filename="a.pdf", workspace_id=ws
        )
    )
    summary_updates = [u for u in db.doc_updates if len(u) == 3]
    assert summary_updates and summary_updates[0][1] == "S."


@pytest.mark.asyncio
async def test_ingest_summary_failure_does_not_abort():
    db = FakeDB()
    ws, doc = _seed(db)
    evts = await _collect(
        _svc(db, summarizer=FakeSummarizer(exc=RuntimeError("boom"))).ingest(
            document_id=doc, source_url="https://x/f", filename="a.pdf", workspace_id=ws
        )
    )
    assert evts[-1]["stage"] == "done"
    assert len([c for c in db.chunks if c["document_id"] == doc]) == 3


@pytest.mark.asyncio
async def test_require_user_returns_sub(monkeypatch):
    import api.deps as deps

    async def fake_verify(token, **kw):
        return "user-42"

    monkeypatch.setattr(deps, "verify_supabase_jwt", fake_verify)
    assert await deps.require_user(authorization="Bearer abc") == "user-42"


@pytest.mark.asyncio
async def test_require_user_401_on_auth_error(monkeypatch):
    import api.deps as deps
    from fastapi import HTTPException

    from api.auth import AuthError

    async def fake_verify(token, **kw):
        raise AuthError("nope")

    monkeypatch.setattr(deps, "verify_supabase_jwt", fake_verify)
    with pytest.raises(HTTPException) as ei:
        await deps.require_user(authorization="Bearer abc")
    assert ei.value.status_code == 401
