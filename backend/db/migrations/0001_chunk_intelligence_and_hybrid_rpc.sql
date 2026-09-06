-- ============================================================
-- 0001 - Chunk intelligence columns + ACL-aware hybrid RPC
-- Baseline = repo-root schema.sql (pre-backend). Forward-only.
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. document_chunks: connector + ACL + structural metadata
-- ------------------------------------------------------------
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS external_id     TEXT,
  ADD COLUMN IF NOT EXISTS source_type     TEXT        NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS acl_permissions JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_modified   TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN document_chunks.external_id IS
  'Source-system id (e.g. Google Drive fileId). NULL for direct uploads.';
COMMENT ON COLUMN document_chunks.source_type IS
  'upload | gdrive | ... - provenance of the chunk.';
COMMENT ON COLUMN document_chunks.acl_permissions IS
  'Additive access grants: {"public": bool, "users": ["<uuid>", ...]}. '
  '{} = fall back to workspace ownership/membership only.';
COMMENT ON COLUMN document_chunks.metadata IS
  'Structural context: {"page_number": int, "headers": ["H1","H2"], "is_table": bool}.';
COMMENT ON COLUMN document_chunks.last_modified IS
  'Source file mtime (Drive modifiedTime); = created_at for uploads.';

-- Delta-sync lookups: DELETE ... WHERE external_id = :fileId
CREATE INDEX IF NOT EXISTS document_chunks_external_id_idx
  ON document_chunks (external_id) WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS document_chunks_source_type_idx
  ON document_chunks (source_type);

-- Containment queries on acl_permissions / metadata
CREATE INDEX IF NOT EXISTS document_chunks_acl_gin_idx
  ON document_chunks USING gin (acl_permissions jsonb_path_ops);
CREATE INDEX IF NOT EXISTS document_chunks_metadata_gin_idx
  ON document_chunks USING gin (metadata jsonb_path_ops);

-- ------------------------------------------------------------
-- 2. documents: companion connector columns (needed by Part 3
--    delta syncer - "does this file already exist in documents").
--    Beyond the brief's literal Part-1 bullet; included so the
--    schema is coherent in one migration.
-- ------------------------------------------------------------
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS external_id    TEXT,
  ADD COLUMN IF NOT EXISTS source_type    TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_modified  TIMESTAMPTZ;

-- One documents row per (workspace, external file); enables upsert.
CREATE UNIQUE INDEX IF NOT EXISTS documents_workspace_external_id_key
  ON documents (workspace_id, external_id) WHERE external_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. match_hybrid_documents - ACL pre-filter -> dense + BM25 -> RRF
--    Pre-filters to chunks visible to :auth_uid BEFORE scoring,
--    so no non-permitted row ever enters ranking.
--    match_documents() is left intact (current app depends on it).
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS match_hybrid_documents(vector, text, uuid, float, int, uuid);

CREATE OR REPLACE FUNCTION match_hybrid_documents(
  query_embedding     vector(768),
  query_text          TEXT,
  auth_uid            UUID,
  match_threshold     FLOAT DEFAULT 0.2,
  match_count         INT   DEFAULT 25,
  filter_workspace_id UUID  DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  document_id UUID,
  content     TEXT,
  metadata    JSONB,
  source_name TEXT,
  similarity  FLOAT
)
LANGUAGE sql STABLE
AS $$
  WITH visible_chunks AS (
    SELECT dc.id, dc.content, dc.document_id, dc.embedding,
           dc.metadata, d.name AS source_name
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE (
        d.workspace_id IN (SELECT w.id FROM workspaces w WHERE w.owner_id = auth_uid)
        OR d.workspace_id IN (SELECT m.workspace_id FROM workspace_members m WHERE m.user_id = auth_uid)
        OR COALESCE(dc.acl_permissions->>'public', 'false') = 'true'
        OR (dc.acl_permissions -> 'users') ? auth_uid::text
      )
      AND (filter_workspace_id IS NULL OR d.workspace_id = filter_workspace_id)
  ),
  vector_search AS (
    SELECT vc.id, vc.content, vc.document_id, vc.metadata, vc.source_name,
           ROW_NUMBER() OVER (ORDER BY vc.embedding <=> query_embedding) AS rank
    FROM visible_chunks vc
    WHERE vc.embedding IS NOT NULL
      AND 1 - (vc.embedding <=> query_embedding) > match_threshold
    ORDER BY vc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  bm25_search AS (
    SELECT vc.id, vc.content, vc.document_id, vc.metadata, vc.source_name,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank_cd(to_tsvector('english', vc.content),
                                 websearch_to_tsquery('english', query_text)) DESC
           ) AS rank
    FROM visible_chunks vc
    WHERE to_tsvector('english', vc.content) @@ websearch_to_tsquery('english', query_text)
    ORDER BY rank
    LIMIT match_count * 2
  ),
  rrf AS (
    SELECT
      COALESCE(v.id, b.id)                   AS id,
      COALESCE(v.document_id, b.document_id) AS document_id,
      COALESCE(v.content, b.content)         AS content,
      COALESCE(v.metadata, b.metadata)       AS metadata,
      COALESCE(v.source_name, b.source_name) AS source_name,
      COALESCE(1.0 / (60 + v.rank), 0.0)
        + COALESCE(1.0 / (60 + b.rank), 0.0) AS rrf_score
    FROM vector_search v
    FULL OUTER JOIN bm25_search b ON v.id = b.id
  )
  SELECT id, document_id, content, metadata, source_name, rrf_score AS similarity
  FROM rrf
  ORDER BY rrf_score DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION
  match_hybrid_documents(vector, text, uuid, float, int, uuid)
  TO authenticated, service_role;

COMMIT;

-- ============================================================
-- ROLLBACK (manual)
--   DROP FUNCTION IF EXISTS match_hybrid_documents(vector, text, uuid, float, int, uuid);
--   DROP INDEX IF EXISTS documents_workspace_external_id_key;
--   ALTER TABLE documents       DROP COLUMN IF EXISTS external_id, DROP COLUMN IF EXISTS source_type,
--                               DROP COLUMN IF EXISTS last_synced_at, DROP COLUMN IF EXISTS last_modified;
--   DROP INDEX IF EXISTS document_chunks_external_id_idx, document_chunks_source_type_idx,
--                        document_chunks_acl_gin_idx, document_chunks_metadata_gin_idx;
--   ALTER TABLE document_chunks DROP COLUMN IF EXISTS external_id, DROP COLUMN IF EXISTS source_type,
--                               DROP COLUMN IF EXISTS acl_permissions, DROP COLUMN IF EXISTS metadata,
--                               DROP COLUMN IF EXISTS last_modified;
-- ============================================================
