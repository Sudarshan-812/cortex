-- ============================================================
-- 0003 - document_chunks.embedding_model backfill
-- Root cause: repo-root schema.sql's CREATE TABLE IF NOT EXISTS
-- document_chunks always included embedding_model, but the table
-- already existed live when that line was added, so the CREATE
-- was a silent no-op and the column was never actually created.
-- Migration 0001 added other chunk-intelligence columns but missed
-- this one. services/ingest.py::_write_chunks has been inserting
-- into it as if it existed, failing every ingest with:
--   column "embedding_model" of relation "document_chunks" does not exist
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-001';

COMMENT ON COLUMN document_chunks.embedding_model IS
  'Model that produced embedding - prevents silent degradation on model changes.';

INSERT INTO schema_migrations (version) VALUES ('0003_document_chunks_embedding_model')
  ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================
-- ROLLBACK (manual)
--   ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding_model;
--   DELETE FROM schema_migrations WHERE version = '0003_document_chunks_embedding_model';
-- ============================================================
