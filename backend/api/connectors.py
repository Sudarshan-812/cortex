"""Google Drive connector: OAuth authorize/callback, folder picker, sync, status."""
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from api.deps import require_user
from core.config import get_settings
from db.pool import get_pool
from integrations.gdrive import DriveAuthError, DriveSyncer, GoogleDriveClient, SupabaseTokenStore
from services.gdrive_oauth import (
    GoogleOAuthClient,
    OAuthError,
    build_authorize_url,
    store_connector,
    verify_state,
)

logger = logging.getLogger("cortex.connectors")


async def _run_sync_safe(folder_id: str, auth_uid: str) -> None:
    """Fire-and-forget sync used after (re)connect. Never raises into the task loop."""
    try:
        await DriveSyncer(await get_pool()).sync_drive_folder(folder_id, auth_uid)
    except Exception as exc:  # noqa: BLE001
        logger.warning("post-connect sync for %s failed: %s", auth_uid, exc)

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

    # Reconnect case: a folder is already chosen -> kick a background re-sync now
    # so the workspace is current the moment the user lands back on Settings.
    pool = await get_pool()
    async with pool.acquire() as conn:
        folder = await conn.fetchval(
            """SELECT ss.folder_id
               FROM drive_sync_state ss
               JOIN connector_accounts ca ON ca.id = ss.connector_account_id
               WHERE ca.user_id = $1 AND ca.provider = 'gdrive'
               ORDER BY ss.last_run_at DESC NULLS LAST
               LIMIT 1""",
            payload["uid"],
        )
    if folder:
        asyncio.create_task(_run_sync_safe(folder, payload["uid"]))

    return RedirectResponse(f"{dest}?gdrive=connected", status_code=302)


@router.get("/folders")
async def folders(
    parent: str = Query("root"), auth_uid: str = Depends(require_user)
) -> dict:
    """Immediate sub-folders of `parent` ('root' or a folder id) - drives the picker."""
    s = get_settings()
    pool = await get_pool()
    store = SupabaseTokenStore(pool)
    try:
        creds = await store.load(auth_uid, "gdrive")
    except DriveAuthError:
        raise HTTPException(status_code=404, detail="no Google Drive connector for this user")
    client = GoogleDriveClient(creds, s, token_store=store)
    try:
        items = await client.list_child_folders(parent)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await client.aclose()
    return {"parent": parent, "folders": items}


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


@router.delete("")
async def disconnect(auth_uid: str = Depends(require_user)) -> dict:
    """Remove the Google Drive connector for this user (cascades sync state)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM connector_accounts WHERE user_id = $1 AND provider = 'gdrive'",
            auth_uid,
        )
    return {"disconnected": True}


@router.get("/status")
async def status(auth_uid: str = Depends(require_user)) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT ca.external_account_email AS email,
                   ca.workspace_id,
                   ss.last_synced_at, ss.last_run_at, ss.last_status, ss.folder_id
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
        doc_count = await conn.fetchval(
            "SELECT count(*) FROM documents "
            "WHERE workspace_id = $1 AND source_type = 'gdrive'",
            row["workspace_id"],
        )
    lsa = row["last_synced_at"]
    lra = row["last_run_at"]
    return {
        "connected": True,
        "email": row["email"],
        "workspace_id": str(row["workspace_id"]) if row["workspace_id"] else None,
        "folder_id": row["folder_id"],
        "last_synced_at": lsa.isoformat() if lsa else None,
        "last_run_at": lra.isoformat() if lra else None,
        "last_status": row["last_status"],
        "document_count": doc_count or 0,
    }
