"""FastAPI surface: POST /v1/query streams the RAG pipeline as SSE."""
from __future__ import annotations

import json

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse

from api.auth import AuthError, verify_supabase_jwt
from core.config import get_settings
from db.pool import get_pool
from models.retrieval import QueryRequest
from services.retrieval import RAGOrchestrator

app = FastAPI(title="Cortex Retrieval API")


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/v1/query")
async def query(req: QueryRequest, authorization: str = Header(...)) -> StreamingResponse:
    s = get_settings()
    token = authorization.removeprefix("Bearer ").strip()
    jwks_url = f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        auth_uid = await verify_supabase_jwt(
            token, jwks_url=jwks_url, legacy_hs256_secret=s.supabase_jwt_secret
        )
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    orchestrator = RAGOrchestrator(await get_pool(), s)

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
