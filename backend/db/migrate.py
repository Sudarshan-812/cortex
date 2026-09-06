"""Minimal forward-only migration runner. Applies unrun backend/db/migrations/*.sql
in order, recording each in schema_migrations. Run: python -m db.migrate"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import asyncpg

from core.config import get_settings

_DIR = Path(__file__).parent / "migrations"


async def _applied(conn: asyncpg.Connection) -> set[str]:
    await conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations "
        "(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    return {r["version"] for r in await conn.fetch("SELECT version FROM schema_migrations")}


async def main() -> int:
    dsn = get_settings().supabase_db_url
    if not dsn:
        print("SUPABASE_DB_URL is not set", file=sys.stderr)
        return 2
    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    try:
        done = await _applied(conn)
        pending = sorted(p for p in _DIR.glob("[0-9]*.sql") if p.stem not in done)
        if not pending:
            print("up to date")
            return 0
        for path in pending:
            print(f"applying {path.name} ...")
            async with conn.transaction():
                await conn.execute(path.read_text(encoding="utf-8"))
                await conn.execute(
                    "INSERT INTO schema_migrations (version) VALUES ($1) "
                    "ON CONFLICT (version) DO NOTHING",
                    path.stem,
                )
        print(f"applied {len(pending)} migration(s)")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
