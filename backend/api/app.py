"""FastAPI surface: POST /v1/query (RAG SSE) + POST /v1/ingest."""
from __future__ import annotations

import json

from fastapi import Depends, FastAPI
from fastapi.responses import StreamingResponse

from api.deps import require_user
from api.ingest import router as ingest_router
from core.config import get_settings
from db.pool import get_pool
from models.retrieval import QueryRequest
from services.retrieval import RAGOrchestrator

app = FastAPI(title="Cortex Retrieval API")
app.include_router(ingest_router)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/v1/query")
async def query(
    req: QueryRequest, auth_uid: str = Depends(require_user)
) -> StreamingResponse:
    orchestrator = RAGOrchestrator(await get_pool(), get_settings())

    async def event_stream():
        try:
            async for event in orchestrator.run(req, auth_uid):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:  # noqa: BLE001
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
