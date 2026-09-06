"""Supabase JWT verification.

Supabase projects now sign access tokens with an asymmetric key (ES256 / P-256,
sometimes RS256). We verify against the project's published JWKS
(`<url>/auth/v1/.well-known/jwks.json`) - no shared secret. A legacy HS256 shared
secret is accepted only if one is explicitly configured (older projects).
"""
from __future__ import annotations

import time

import httpx

_JWKS_TTL = 600.0  # seconds
_ASYM_ALGS = ["ES256", "RS256"]


class AuthError(Exception):
    ...


class _JwksCache:
    def __init__(self, url: str, *, client: httpx.AsyncClient | None = None) -> None:
        self._url = url
        self._client = client or httpx.AsyncClient(timeout=10)
        self._keys: dict[str, dict] = {}
        self._fetched_at = 0.0

    async def get(self, kid: str) -> dict:
        stale = time.monotonic() - self._fetched_at > _JWKS_TTL
        if kid not in self._keys or stale:
            await self._refresh()
        if kid not in self._keys:
            await self._refresh()  # key rotation between TTL windows
        try:
            return self._keys[kid]
        except KeyError:
            raise AuthError(f"no JWKS key for kid {kid!r}") from None

    async def _refresh(self) -> None:
        resp = await self._client.get(self._url)
        resp.raise_for_status()
        self._keys = {
            k["kid"]: k for k in resp.json().get("keys", []) if k.get("kid")
        }
        self._fetched_at = time.monotonic()


_shared_cache: _JwksCache | None = None


def _cache_for(jwks_url: str) -> _JwksCache:
    global _shared_cache
    if _shared_cache is None or _shared_cache._url != jwks_url:
        _shared_cache = _JwksCache(jwks_url)
    return _shared_cache


async def verify_supabase_jwt(
    token: str,
    *,
    jwks_url: str,
    audience: str = "authenticated",
    legacy_hs256_secret: str = "",
    cache: _JwksCache | None = None,
) -> str:
    if not token:
        raise AuthError("missing bearer token")
    from jose import JWTError, jwt

    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise AuthError(f"malformed token: {exc}") from exc

    alg = header.get("alg", "")
    try:
        if alg == "HS256":
            if not legacy_hs256_secret:
                raise AuthError("HS256 token but no legacy secret configured")
            claims = jwt.decode(
                token, legacy_hs256_secret, algorithms=["HS256"], audience=audience
            )
        else:
            kid = header.get("kid")
            if not kid:
                raise AuthError("token header missing 'kid'")
            jwk = await (cache or _cache_for(jwks_url)).get(kid)
            claims = jwt.decode(token, jwk, algorithms=_ASYM_ALGS, audience=audience)
    except JWTError as exc:
        raise AuthError(f"invalid token: {exc}") from exc

    sub = claims.get("sub")
    if not sub:
        raise AuthError("token has no 'sub' claim")
    return str(sub)
