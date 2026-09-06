"""Google Drive OAuth: signed state, auth-code exchange, Vault-backed token store."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import httpx

from core.config import Settings, get_settings
from core.retry import request_with_retry

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
_SCOPE = "https://www.googleapis.com/auth/drive.readonly"
_STATE_TTL = 600  # seconds


class OAuthError(RuntimeError):
    ...


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64u_dec(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sig(body: str, secret: str) -> str:
    return _b64u(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())


def sign_state(payload: dict, *, secret: str) -> str:
    body = _b64u(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    return f"{body}.{_sig(body, secret)}"


def verify_state(state: str, *, secret: str) -> dict:
    try:
        body, sig = state.split(".", 1)
    except ValueError as exc:
        raise OAuthError("malformed state") from exc
    if not hmac.compare_digest(sig, _sig(body, secret)):
        raise OAuthError("bad state signature")
    payload = json.loads(_b64u_dec(body))
    if int(payload.get("exp", 0)) < int(time.time()):
        raise OAuthError("state expired")
    return payload


def build_authorize_url(*, uid: str, workspace_id: str, settings: Settings) -> str:
    state = sign_state(
        {"uid": uid, "ws": workspace_id, "exp": int(time.time()) + _STATE_TTL},
        secret=settings.connector_state_secret,
    )
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": _SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{_AUTH_URL}?{urlencode(params)}"


class GoogleOAuthClient:
    def __init__(
        self, settings: Settings | None = None, *, client: httpx.AsyncClient | None = None
    ) -> None:
        self._s = settings or get_settings()
        self._client = client or httpx.AsyncClient(timeout=30)
        self._owns = client is None

    async def aclose(self) -> None:
        if self._owns:
            await self._client.aclose()

    async def exchange_code(self, code: str) -> dict:
        resp = await request_with_retry(
            lambda: self._client.post(
                _TOKEN_URL,
                data={
                    "code": code,
                    "client_id": self._s.google_oauth_client_id,
                    "client_secret": self._s.google_oauth_client_secret,
                    "redirect_uri": self._s.google_oauth_redirect_uri,
                    "grant_type": "authorization_code",
                },
            ),
            max_retries=self._s.http_max_retries,
        )
        tok = resp.json()
        if "refresh_token" not in tok:
            raise OAuthError(
                "no refresh_token returned — revoke the app at "
                "myaccount.google.com/permissions and retry"
            )
        return tok

    async def userinfo(self, access_token: str) -> dict:
        if not access_token:
            return {}
        try:
            resp = await self._client.get(
                _USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return {}


async def store_connector(
    pool,
    *,
    uid: str,
    workspace_id: str,
    refresh_token: str,
    email: str | None,
    provider: str = "gdrive",
) -> str:
    """Write the refresh token to Supabase Vault, upsert connector_accounts."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            existing = await conn.fetchval(
                "SELECT refresh_token_secret_id FROM connector_accounts "
                "WHERE user_id = $1 AND provider = $2",
                uid,
                provider,
            )
            if existing:
                await conn.execute(
                    "SELECT vault.update_secret($1::uuid, $2)", existing, refresh_token
                )
                secret_id = existing
            else:
                secret_id = await conn.fetchval(
                    "SELECT vault.create_secret($1, $2)",
                    refresh_token,
                    f"{provider}_refresh:{uid}:{workspace_id}",
                )
            account_id = await conn.fetchval(
                """
                INSERT INTO connector_accounts
                  (user_id, workspace_id, provider, external_account_email,
                   refresh_token_secret_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id, provider)
                DO UPDATE SET workspace_id            = EXCLUDED.workspace_id,
                              external_account_email  = EXCLUDED.external_account_email,
                              refresh_token_secret_id = EXCLUDED.refresh_token_secret_id,
                              updated_at = now()
                RETURNING id
                """,
                uid,
                workspace_id,
                provider,
                email,
                secret_id,
            )
    return str(account_id)
