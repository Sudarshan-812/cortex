"""W2 - Google Drive connector: signed state, code exchange, Vault store, routes."""
from __future__ import annotations

import time

import httpx
import pytest

from core.config import Settings
from services.gdrive_oauth import (
    GoogleOAuthClient,
    OAuthError,
    build_authorize_url,
    sign_state,
    store_connector,
    verify_state,
)
from tests._fakes import FakeDB, FakePool

SECRET = "test-state-secret"


def _settings(**over) -> Settings:
    base = dict(
        google_oauth_client_id="cid",
        google_oauth_client_secret="csecret",
        google_oauth_redirect_uri="http://localhost:8000/v1/connectors/google-drive/callback",
        connector_state_secret=SECRET,
        frontend_url="http://localhost:3000",
        http_max_retries=2,
    )
    base.update(over)
    return Settings(**base)


# ---- state signing ----


def test_sign_verify_state_roundtrip():
    p = {"uid": "U", "ws": "ws-1", "exp": int(time.time()) + 300}
    assert verify_state(sign_state(p, secret=SECRET), secret=SECRET) == p


def test_verify_state_rejects_tampered_body():
    body, sig = sign_state({"uid": "U", "exp": int(time.time()) + 300}, secret=SECRET).split(".")
    with pytest.raises(OAuthError):
        verify_state(f"{body}x.{sig}", secret=SECRET)


def test_verify_state_rejects_wrong_secret():
    st = sign_state({"uid": "U", "exp": int(time.time()) + 300}, secret=SECRET)
    with pytest.raises(OAuthError):
        verify_state(st, secret="other")


def test_verify_state_rejects_expired():
    st = sign_state({"uid": "U", "exp": int(time.time()) - 1}, secret=SECRET)
    with pytest.raises(OAuthError):
        verify_state(st, secret=SECRET)


def test_build_authorize_url_shape():
    url = build_authorize_url(uid="U", workspace_id="ws-1", settings=_settings())
    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=cid" in url and "access_type=offline" in url and "prompt=consent" in url
    state = url.split("state=")[1].split("&")[0]
    from urllib.parse import unquote

    assert verify_state(unquote(state), secret=SECRET)["ws"] == "ws-1"


# ---- code exchange ----


def _oauth(handler) -> GoogleOAuthClient:
    return GoogleOAuthClient(
        _settings(), client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    )


@pytest.mark.asyncio
async def test_exchange_code_returns_tokens(no_backoff):
    def handler(request):
        return httpx.Response(
            200, json={"refresh_token": "rt", "access_token": "at", "expires_in": 3600},
            request=request,
        )

    tok = await _oauth(handler).exchange_code("auth-code")
    assert tok["refresh_token"] == "rt"


@pytest.mark.asyncio
async def test_exchange_code_missing_refresh_token_raises(no_backoff):
    def handler(request):
        return httpx.Response(200, json={"access_token": "at"}, request=request)

    with pytest.raises(OAuthError):
        await _oauth(handler).exchange_code("auth-code")


# ---- store_connector ----


@pytest.mark.asyncio
async def test_store_connector_creates_vault_secret_and_upsert():
    db = FakeDB()
    db.add_workspace("U", "ws-1")
    acc = await store_connector(
        FakePool(db), uid="U", workspace_id="ws-1", refresh_token="rt1", email="a@b.com"
    )
    c = db.connectors[("U", "gdrive")]
    assert c["id"] == acc and c["external_account_email"] == "a@b.com"
    assert db.vault[str(c["refresh_token_secret_id"])] == "rt1"


@pytest.mark.asyncio
async def test_store_connector_reconnect_updates_same_secret_and_account():
    db = FakeDB()
    db.add_workspace("U", "ws-1")
    acc1 = await store_connector(
        FakePool(db), uid="U", workspace_id="ws-1", refresh_token="rt1", email="a@b.com"
    )
    sid1 = db.connectors[("U", "gdrive")]["refresh_token_secret_id"]
    acc2 = await store_connector(
        FakePool(db), uid="U", workspace_id="ws-1", refresh_token="rt2", email="a@b.com"
    )
    assert acc1 == acc2
    assert db.connectors[("U", "gdrive")]["refresh_token_secret_id"] == sid1  # no orphan
    assert db.vault[str(sid1)] == "rt2"  # updated in place


# ---- routes ----


@pytest.fixture
def client(monkeypatch):
    from fastapi.testclient import TestClient

    from api.app import app
    from api.deps import require_user

    db = FakeDB()

    async def fake_get_pool():
        return FakePool(db)

    monkeypatch.setattr("api.connectors.get_pool", fake_get_pool)
    app.dependency_overrides[require_user] = lambda: "U"
    tc = TestClient(app)
    tc.db = db  # type: ignore[attr-defined]
    yield tc
    app.dependency_overrides.clear()


def test_authorize_route_returns_url(client):
    client.db.add_workspace("U", "ws-1")
    r = client.get("/v1/connectors/google-drive/authorize", params={"workspace_id": "ws-1"})
    assert r.status_code == 200
    assert r.json()["url"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")


def test_authorize_route_403_for_unowned_workspace(client):
    client.db.add_workspace("someone-else", "ws-x")
    r = client.get("/v1/connectors/google-drive/authorize", params={"workspace_id": "ws-x"})
    assert r.status_code == 403


def test_callback_bad_state_redirects_error(client):
    r = client.get(
        "/v1/connectors/google-drive/callback",
        params={"code": "c", "state": "garbage"},
        follow_redirects=False,
    )
    assert r.status_code == 302 and "gdrive=error" in r.headers["location"]


def test_callback_success_redirects_connected(client, monkeypatch):
    recorded = {}

    class FakeOAuth:
        def __init__(self, *a, **k):
            pass

        async def exchange_code(self, code):
            return {"refresh_token": "rt", "access_token": "at"}

        async def userinfo(self, at):
            return {"email": "me@example.com"}

        async def aclose(self):
            pass

    async def fake_store(pool, **kw):
        recorded.update(kw)
        return "acc-1"

    monkeypatch.setattr("api.connectors.GoogleOAuthClient", FakeOAuth)
    monkeypatch.setattr("api.connectors.store_connector", fake_store)

    state = sign_state({"uid": "U", "ws": "ws-1", "exp": int(time.time()) + 300}, secret=SECRET)
    r = client.get(
        "/v1/connectors/google-drive/callback",
        params={"code": "auth-code", "state": state},
        follow_redirects=False,
    )
    assert r.status_code == 302 and "gdrive=connected" in r.headers["location"]
    assert recorded["uid"] == "U" and recorded["refresh_token"] == "rt"


def test_sync_route_404_without_connector(client):
    r = client.post("/v1/connectors/google-drive/sync", json={"folder_id": "folder-1"})
    assert r.status_code == 404


def test_status_route_disconnected_then_connected(client):
    assert client.get("/v1/connectors/google-drive/status").json() == {"connected": False}
    client.db.add_workspace("U", "ws-1")
    client.db.connectors[("U", "gdrive")] = {
        "id": "acc-1",
        "user_id": "U",
        "workspace_id": "ws-1",
        "provider": "gdrive",
        "external_account_email": "me@example.com",
        "refresh_token_secret_id": "sid",
    }
    body = client.get("/v1/connectors/google-drive/status").json()
    assert body["connected"] is True and body["email"] == "me@example.com"
