"""FastAPI dependencies."""
from __future__ import annotations

from fastapi import Header, HTTPException

from api.auth import AuthError, verify_supabase_jwt
from core.config import get_settings


async def require_user(authorization: str | None = Header(default=None)) -> str:
    """Verify the forwarded Supabase access token -> return auth_uid."""
    if not authorization:
        raise HTTPException(status_code=401, detail="missing Authorization header")
    s = get_settings()
    token = authorization.removeprefix("Bearer ").strip()
    jwks_url = f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        return await verify_supabase_jwt(
            token, jwks_url=jwks_url, legacy_hs256_secret=s.supabase_jwt_secret
        )
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
