-- ============================================================
-- Cortex — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Enable pgvector extension (required for vector similarity search)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLES
-- ============================================================

-- Workspaces (one per user for now, supports teams later)
CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace members (role-based: admin | member)
CREATE TABLE IF NOT EXISTS workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- Uploaded documents (metadata only; raw file lives in Storage)
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type    TEXT,
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document chunks with 768-dim embeddings
-- embedding_model tracks which model produced the vector (prevents silent degradation on model changes)
CREATE TABLE IF NOT EXISTS document_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  embedding       vector(768),
  embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-001',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- GIN index for BM25 full-text search (required for hybrid RRF)
CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
  ON document_chunks USING gin(to_tsvector('english', content));

-- ============================================================
-- CHAT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'New Chat',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  sources    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx
  ON chat_messages (session_id, created_at DESC);

-- ============================================================
-- HYBRID SEARCH FUNCTION
-- Combines dense vector search (pgvector) + sparse BM25 (PostgreSQL FTS)
-- fused via Reciprocal Rank Fusion (RRF, k=60)
-- ============================================================

DROP FUNCTION IF EXISTS match_documents(vector, text, float, int, uuid);
DROP FUNCTION IF EXISTS match_documents(vector, float, int, uuid);

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding     vector(768),
  query_text          TEXT,
  match_threshold     FLOAT,
  match_count         INT,
  filter_workspace_id UUID
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  document_id UUID,
  similarity  FLOAT
)
LANGUAGE sql STABLE
AS $$
  WITH vector_search AS (
    SELECT
      dc.id,
      dc.content,
      dc.document_id,
      ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) AS rank
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.workspace_id = filter_workspace_id
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  bm25_search AS (
    SELECT
      dc.id,
      dc.content,
      dc.document_id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(to_tsvector('english', dc.content),
                            websearch_to_tsquery('english', query_text)) DESC
      ) AS rank
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.workspace_id = filter_workspace_id
      AND to_tsvector('english', dc.content) @@ websearch_to_tsquery('english', query_text)
    ORDER BY rank
    LIMIT match_count * 2
  ),
  rrf AS (
    SELECT
      COALESCE(v.id, b.id)             AS id,
      COALESCE(v.content, b.content)   AS content,
      COALESCE(v.document_id, b.document_id) AS document_id,
      COALESCE(1.0 / (60 + v.rank), 0.0)
        + COALESCE(1.0 / (60 + b.rank), 0.0) AS rrf_score
    FROM vector_search v
    FULL OUTER JOIN bm25_search b ON v.id = b.id
  )
  SELECT id, content, document_id, rrf_score AS similarity
  FROM rrf
  ORDER BY rrf_score DESC
  LIMIT match_count;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages     ENABLE ROW LEVEL SECURITY;

-- Workspaces: owner only
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- Workspace members: members of the workspace
CREATE POLICY "members_select" ON workspace_members FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "members_insert" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Documents: users who own the workspace
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "documents_delete" ON documents FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Chunks: same ownership chain
CREATE POLICY "chunks_select" ON document_chunks FOR SELECT
  USING (document_id IN (
    SELECT d.id FROM documents d
    JOIN workspaces w ON d.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));
CREATE POLICY "chunks_insert" ON document_chunks FOR INSERT
  WITH CHECK (document_id IN (
    SELECT d.id FROM documents d
    JOIN workspaces w ON d.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));

-- Chat sessions: workspace owner
CREATE POLICY "chat_sessions_select" ON chat_sessions FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "chat_sessions_insert" ON chat_sessions FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "chat_sessions_update" ON chat_sessions FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "chat_sessions_delete" ON chat_sessions FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Chat messages: via session → workspace → owner
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  USING (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN workspaces w ON cs.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN workspaces w ON cs.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));

-- ============================================================
-- STORAGE
-- ============================================================
-- In Supabase Dashboard → Storage → New Bucket:
--   Name: synapse-uploads
--   Public: false
--
-- Then add these Storage Policies:
--   INSERT: ((bucket_id = 'synapse-uploads') AND (auth.role() = 'authenticated'))
--   SELECT: ((bucket_id = 'synapse-uploads') AND (auth.role() = 'authenticated'))
--   DELETE: ((bucket_id = 'synapse-uploads') AND (auth.role() = 'authenticated'))
-- ============================================================
