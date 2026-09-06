"""Lazy asyncpg pool with the pgvector codec registered per connection."""
from __future__ import annotations

import asyncpg

from core.config import get_settings

_pool: asyncpg.Pool | None = None


async def _init_conn(conn: asyncpg.Connection) -> None:
    try:
        from pgvector.asyncpg import register_vector

        await register_vector(conn)
    except Exception:  # noqa: BLE001 — vector codec optional for non-embedding paths
        pass


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        s = get_settings()
        _pool = await asyncpg.create_pool(
            s.supabase_db_url,
            min_size=1,
            max_size=max(4, s.sync_max_concurrency + 2),
            statement_cache_size=0,  # safe behind pgbouncer transaction pooling
            init=_init_conn,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
