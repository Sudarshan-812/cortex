"""Supabase JWT verification (HS256, project JWT secret)."""
from __future__ import annotations


class AuthError(Exception):
    ...


def verify_supabase_jwt(
    token: str, *, secret: str, audience: str = "authenticated"
) -> str:
    if not secret:
        raise AuthError("SUPABASE_JWT_SECRET not configured")
    if not token:
        raise AuthError("missing bearer token")
    from jose import JWTError, jwt

    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"], audience=audience)
    except JWTError as exc:
        raise AuthError(f"invalid token: {exc}") from exc
    sub = claims.get("sub")
    if not sub:
        raise AuthError("token has no sub claim")
    return str(sub)
