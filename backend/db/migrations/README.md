# Backend DB migrations

Forward-only, numbered SQL. **Baseline** is the repo-root `schema.sql`
(the pre-backend state, applied by hand). Every file here builds on it.

| # | File | Summary |
|---|------|---------|
| 0001 | `0001_chunk_intelligence_and_hybrid_rpc.sql` | `document_chunks` connector/ACL/metadata columns; `documents` connector columns; `match_hybrid_documents` RPC (ACL pre-filter → dense + BM25 → RRF k=60) |

## Applying

Each file is idempotent and wrapped in a transaction.

```bash
# via psql / pooler connection string
psql "$SUPABASE_DB_URL" -f backend/db/migrations/0001_chunk_intelligence_and_hybrid_rpc.sql
```

A Python runner (`backend/db/migrate.py`) that records applied files in a
`schema_migrations` table lands with Part 2's backend skeleton.
