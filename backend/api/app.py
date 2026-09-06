"""FastAPI surface: POST /v1/query (RAG SSE) + POST /v1/ingest + connectors.

When SYNC_INTERVAL_MINUTES > 0 a background task re-syncs every tracked Drive
folder on that cadence, so connected workspaces stay current without a button.
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging

from fastapi import Depends, FastAPI
from fastapi.responses import StreamingResponse

from api.connectors import router as connectors_router
from api.deps import require_user
from api.ingest import router as ingest_router
from core.config import get_settings
from db.pool import get_pool
from integrations.gdrive import DriveSyncer
from models.retrieval import QueryRequest
from services.retrieval import RAGOrchestrator

logger = logging.getLogger("cortex.app")


async def _periodic_drive_sync(interval_seconds: int) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT ca.user_id, ss.folder_id
                       FROM drive_sync_state ss
                       JOIN connector_accounts ca ON ca.id = ss.connector_account_id
                       WHERE ca.provider = 'gdrive'"""
                )
            for r in rows:
                try:
                    await DriveSyncer(pool).sync_drive_folder(
                        r["folder_id"], str(r["user_id"])
                    )
                except Exception as exc:  # noqa: BLE001 - one folder must not stop the rest
                    logger.warning(
                        "scheduled sync failed for %s/%s: %s",
                        r["user_id"], r["folder_id"], exc,
                    )
        except Exception as exc:  # noqa: BLE001
            logger.warning("scheduled sync sweep failed: %s", exc)


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI):
    task = None
    minutes = get_settings().sync_interval_minutes
    if minutes and minutes > 0:
        logger.info("periodic Drive sync enabled: every %d min", minutes)
        task = asyncio.create_task(_periodic_drive_sync(minutes * 60))
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task


app = FastAPI(title="Cortex Retrieval API", lifespan=lifespan)
app.include_router(ingest_router)
app.include_router(connectors_router)


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
