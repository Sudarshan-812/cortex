"""JWT verification - ES256 via mocked JWKS, plus the legacy HS256 fallback."""
from __future__ import annotations

import time

import httpx
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from jose import jwt
from jose.backends.cryptography_backend import CryptographyECKey

from api.auth import AuthError, _JwksCache, verify_supabase_jwt

KID = "test-kid-1"


def _keypair():
    priv = ec.generate_private_key(ec.SECP256R1())
    jwk_priv = CryptographyECKey(priv, "ES256").to_dict()
    jwk_pub = {k: v for k, v in jwk_priv.items() if k != "d"}
    jwk_pub.update(kid=KID, use="sig", alg="ES256")
    return jwk_priv, jwk_pub


def _token(jwk_priv, *, sub="user-123", aud="authenticated", exp_delta=3600, kid=KID):
    return jwt.encode(
        {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_delta},
        jwk_priv,
        algorithm="ES256",
        headers={"kid": kid},
    )


def _cache(jwk_pub, *, calls: list | None = None) -> _JwksCache:
    def handler(request):
        if calls is not None:
            calls.append(str(request.url))
        return httpx.Response(200, json={"keys": [jwk_pub]}, request=request)

    return _JwksCache(
        "https://x/jwks", client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    )


@pytest.mark.asyncio
async def test_verifies_es256_token():
    priv, pub = _keypair()
    uid = await verify_supabase_jwt(_token(priv), jwks_url="https://x/jwks", cache=_cache(pub))
    assert uid == "user-123"


@pytest.mark.asyncio
async def test_rejects_wrong_audience():
    priv, pub = _keypair()
    with pytest.raises(AuthError):
        await verify_supabase_jwt(
            _token(priv, aud="other"), jwks_url="https://x/jwks", cache=_cache(pub)
        )


@pytest.mark.asyncio
async def test_rejects_expired_token():
    priv, pub = _keypair()
    with pytest.raises(AuthError):
        await verify_supabase_jwt(
            _token(priv, exp_delta=-10), jwks_url="https://x/jwks", cache=_cache(pub)
        )


@pytest.mark.asyncio
async def test_unknown_kid_refetches_then_fails():
    priv, pub = _keypair()
    calls: list = []
    with pytest.raises(AuthError):
        await verify_supabase_jwt(
            _token(priv, kid="rotated-away"),
            jwks_url="https://x/jwks",
            cache=_cache(pub, calls=calls),
        )
    assert len(calls) >= 2  # initial fetch + one rotation refetch


@pytest.mark.asyncio
async def test_missing_kid_rejected():
    priv, pub = _keypair()
    tok = jwt.encode({"sub": "x", "aud": "authenticated"}, priv, algorithm="ES256")
    with pytest.raises(AuthError):
        await verify_supabase_jwt(tok, jwks_url="https://x/jwks", cache=_cache(pub))


@pytest.mark.asyncio
async def test_hs256_path_with_legacy_secret():
    tok = jwt.encode({"sub": "u9", "aud": "authenticated"}, "legacy-secret", algorithm="HS256")
    uid = await verify_supabase_jwt(
        tok, jwks_url="https://x/jwks", legacy_hs256_secret="legacy-secret"
    )
    assert uid == "u9"


@pytest.mark.asyncio
async def test_hs256_rejected_without_legacy_secret():
    tok = jwt.encode({"sub": "u9", "aud": "authenticated"}, "legacy-secret", algorithm="HS256")
    with pytest.raises(AuthError):
        await verify_supabase_jwt(tok, jwks_url="https://x/jwks")


@pytest.mark.asyncio
async def test_malformed_token_rejected():
    with pytest.raises(AuthError):
        await verify_supabase_jwt("not.a.jwt", jwks_url="https://x/jwks")
