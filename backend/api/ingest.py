"""POST /v1/ingest — parse + embed + chunk a document already uploaded to Storage."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.deps import require_user
from db.pool import get_pool
from services.ingest import IngestService

router = APIRouter(prefix="/v1", tags=["ingest"])


class IngestRequest(BaseModel):
    document_id: str
    source_url: str = Field(min_length=1)  # short-lived Supabase Storage signed URL
    filename: str
    workspace_id: str


@router.post("/ingest")
async def ingest(
    req: IngestRequest, auth_uid: str = Depends(require_user)
) -> StreamingResponse:
    pool = await get_pool()
    async with pool.acquire() as conn:
        owned = await conn.fetchval(
            """SELECT 1 FROM documents d JOIN workspaces w ON w.id = d.workspace_id
               WHERE d.id = $1 AND d.workspace_id = $2 AND w.owner_id = $3""",
            req.document_id,
            req.workspace_id,
            auth_uid,
        )
    if not owned:
        raise HTTPException(status_code=403, detail="document not in a workspace you own")

    svc = IngestService(pool)

    async def gen():
        try:
            async for evt in svc.ingest(
                document_id=req.document_id,
                source_url=req.source_url,
                filename=req.filename,
                workspace_id=req.workspace_id,
            ):
                yield f"data: {json.dumps(evt)}\n\n"
        except Exception as exc:  # noqa: BLE001
            yield f"data: {json.dumps({'stage': 'error', 'message': str(exc)})}\n\n"
        finally:
            await svc.aclose()

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
