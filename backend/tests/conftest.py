import asyncio
import os

import pytest

os.environ.setdefault("SUPABASE_DB_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_OAUTH_CLIENT_ID", "test-client")
os.environ.setdefault("GOOGLE_OAUTH_CLIENT_SECRET", "test-secret")
os.environ.setdefault(
    "GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/v1/connectors/google-drive/callback"
)
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("CONNECTOR_STATE_SECRET", "test-state-secret")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")


@pytest.fixture
def no_backoff(monkeypatch):
    """Collapse retry backoff sleeps so rate-limit tests run instantly."""
    real_sleep = asyncio.sleep
    monkeypatch.setattr(asyncio, "sleep", lambda *a, **k: real_sleep(0))
