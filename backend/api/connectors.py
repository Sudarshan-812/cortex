"""Google Drive connector: OAuth authorize/callback, sync trigger, status."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from api.deps import require_user
from core.config import get_settings
from db.pool import get_pool
from integrations.gdrive import DriveSyncer
from services.gdrive_oauth import (
    GoogleOAuthClient,
    OAuthError,
    build_authorize_url,
    store_connector,
    verify_state,
)

router = APIRouter(prefix="/v1/connectors/google-drive", tags=["connectors"])


class SyncRequest(BaseModel):
    folder_id: str


@router.get("/authorize")
async def authorize(workspace_id: str, auth_uid: str = Depends(require_user)) -> dict:
    s = get_settings()
    if not s.google_oauth_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    pool = await get_pool()
    async with pool.acquire() as conn:
        owned = await conn.fetchval(
            "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2",
            workspace_id,
            auth_uid,
        )
    if not owned:
        raise HTTPException(status_code=403, detail="not your workspace")
    return {"url": build_authorize_url(uid=auth_uid, workspace_id=workspace_id, settings=s)}


@router.get("/callback")
async def callback(code: str = Query(...), state: str = Query(...)) -> RedirectResponse:
    s = get_settings()
    dest = f"{s.frontend_url.rstrip('/')}/dashboard/settings"
    try:
        payload = verify_state(state, secret=s.connector_state_secret)
    except OAuthError as exc:
        return RedirectResponse(f"{dest}?gdrive=error&reason={exc}", status_code=302)

    oauth = GoogleOAuthClient(s)
    try:
        tok = await oauth.exchange_code(code)
        info = await oauth.userinfo(tok.get("access_token", ""))
    except OAuthError as exc:
        return RedirectResponse(f"{dest}?gdrive=error&reason={exc}", status_code=302)
    finally:
        await oauth.aclose()

    await store_connector(
        await get_pool(),
        uid=payload["uid"],
        workspace_id=payload["ws"],
        refresh_token=tok["refresh_token"],
        email=info.get("email"),
    )
    return RedirectResponse(f"{dest}?gdrive=connected", status_code=302)


@router.post("/sync")
async def sync(req: SyncRequest, auth_uid: str = Depends(require_user)) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT ca.id FROM connector_accounts ca
               JOIN workspaces w ON w.id = ca.workspace_id
               WHERE ca.user_id = $1 AND ca.provider = 'gdrive' AND w.owner_id = $1""",
            auth_uid,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="no Google Drive connector for this user")
    report = await DriveSyncer(pool).sync_drive_folder(req.folder_id, auth_uid)
    return report.model_dump(mode="json")


@router.get("/status")
async def status(auth_uid: str = Depends(require_user)) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT ca.external_account_email AS email,
                   ss.last_synced_at, ss.last_status, ss.folder_id
            FROM connector_accounts ca
            LEFT JOIN drive_sync_state ss ON ss.connector_account_id = ca.id
            WHERE ca.user_id = $1 AND ca.provider = 'gdrive'
            ORDER BY ss.last_run_at DESC NULLS LAST
            LIMIT 1
            """,
            auth_uid,
        )
    if row is None:
        return {"connected": False}
    lsa = row["last_synced_at"]
    return {
        "connected": True,
        "email": row["email"],
        "folder_id": row["folder_id"],
        "last_synced_at": lsa.isoformat() if lsa else None,
        "last_status": row["last_status"],
    }
