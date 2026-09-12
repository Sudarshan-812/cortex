-- ============================================================
-- 0004 - Async ingestion status for documents
-- Upload used to block the request until parse+embed+write fully
-- finished (minutes for table-heavy PDFs). This adds a status
-- column so the upload request can return immediately while
-- ingestion continues in the background, and the UI can poll for
-- progress instead of holding a single long-lived request open.
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS status_message TEXT;

-- Existing rows predate this column and are already fully indexed
-- (or already permanently failed with 0 chunks, which is fine to
-- surface as 'ready' with no chunks rather than a false 'queued').
UPDATE documents SET status = 'ready' WHERE status IS NULL;

ALTER TABLE documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('queued', 'processing', 'ready', 'failed'));

COMMENT ON COLUMN documents.status IS
  'queued -> processing -> ready|failed. Set by the ingest worker, polled by the upload UI.';
COMMENT ON COLUMN documents.status_message IS
  'Human-readable error detail when status = failed.';

INSERT INTO schema_migrations (version) VALUES ('0004_documents_processing_status')
  ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================
-- ROLLBACK (manual)
--   ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
--   ALTER TABLE documents DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS status_message;
--   DELETE FROM schema_migrations WHERE version = '0004_documents_processing_status';
-- ============================================================
