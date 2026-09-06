"""Runtime settings (pydantic-settings). Reads .env then process env.

Field names map case-insensitively to env vars, e.g. `supabase_db_url` <- SUPABASE_DB_URL.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # Postgres — service-role connection (session-mode pooler :5432 or direct).
    # Left lenient so import/parse paths don't require it; connect fails loudly if unset.
    supabase_db_url: str = ""

    # Google OAuth (Drive connector)
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""

    # Gemini embeddings — must match the Next.js ingest path exactly.
    gemini_api_key: str = ""
    embedding_model: str = "gemini-embedding-001"
    embedding_dim: int = 768

    # Sync tuning / backpressure
    sync_max_concurrency: int = 4
    sync_batch_size: int = 25
    embed_batch_size: int = 16
    embed_max_concurrency: int = 2
    http_max_retries: int = 5

    # Retrieval / synthesis (Part 4)
    retrieval_mode: str = "rpc"  # rpc (match_hybrid_documents) | app (parallel + Python RRF)
    retrieval_candidates: int = 25
    answer_top_k: int = 5
    rerank_model: str = "gemini-3.1-flash-lite"
    crag_model: str = "gemini-3.1-flash-lite"
    crag_threshold: float = 0.65
    anthropic_api_key: str = ""
    synthesis_model: str = "claude-opus-5"
    synthesis_max_tokens: int = 2048
    supabase_jwt_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
