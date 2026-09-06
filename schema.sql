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
-- DOCUMENT INTELLIGENCE (run as a migration if tables already exist)
-- ============================================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS topics  JSONB DEFAULT '[]'::jsonb;

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

-- answered_from: 'documents' | 'web' | 'both' | 'none'
-- Lets the UI label how an assistant answer was grounded (grounding guardrail, §3.2).
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS answered_from TEXT;

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
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
-- UPDATE was missing — a workspace could never be renamed under RLS.
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- Workspace members: a user sees their own membership rows; the workspace owner
-- manages the roster (insert / change role / remove).
DROP POLICY IF EXISTS "members_select" ON workspace_members;
CREATE POLICY "members_select" ON workspace_members FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "members_insert" ON workspace_members;
CREATE POLICY "members_insert" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
-- UPDATE / DELETE were missing — deleteWorkspace() (src/app/actions.ts) removes
-- member rows by workspace_id, which silently no-ops without a DELETE policy.
DROP POLICY IF EXISTS "members_update" ON workspace_members;
CREATE POLICY "members_update" ON workspace_members FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "members_delete" ON workspace_members;
CREATE POLICY "members_delete" ON workspace_members FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Documents: users who own the workspace
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
-- UPDATE was missing — the auto-summary / topics writer (src/app/actions.ts and
-- src/app/api/upload/route.ts) runs under the caller's RLS context, so without
-- this policy every documents.update({summary, topics}) silently touched 0 rows
-- and Document Intelligence never persisted.
DROP POLICY IF EXISTS "documents_update" ON documents;
CREATE POLICY "documents_update" ON documents FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "documents_delete" ON documents;
CREATE POLICY "documents_delete" ON documents FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Chunks: same ownership chain
DROP POLICY IF EXISTS "chunks_select" ON document_chunks;
CREATE POLICY "chunks_select" ON document_chunks FOR SELECT
  USING (document_id IN (
    SELECT d.id FROM documents d
    JOIN workspaces w ON d.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS "chunks_insert" ON document_chunks;
CREATE POLICY "chunks_insert" ON document_chunks FOR INSERT
  WITH CHECK (document_id IN (
    SELECT d.id FROM documents d
    JOIN workspaces w ON d.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));
-- UPDATE / DELETE were missing — without them a chunk row could never be
-- edited or removed under RLS, and re-embed / cleanup paths would silently fail.
DROP POLICY IF EXISTS "chunks_update" ON document_chunks;
CREATE POLICY "chunks_update" ON document_chunks FOR UPDATE
  USING (document_id IN (
    SELECT d.id FROM documents d
    JOIN workspaces w ON d.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ))
  WITH CHECK (document_id IN (
    SELECT d.id FROM documents d
    JOIN workspaces w ON d.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS "chunks_delete" ON document_chunks;
CREATE POLICY "chunks_delete" ON document_chunks FOR DELETE
  USING (document_id IN (
    SELECT d.id FROM documents d
    JOIN workspaces w ON d.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));

-- Chat sessions: workspace owner
DROP POLICY IF EXISTS "chat_sessions_select" ON chat_sessions;
CREATE POLICY "chat_sessions_select" ON chat_sessions FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "chat_sessions_insert" ON chat_sessions;
CREATE POLICY "chat_sessions_insert" ON chat_sessions FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "chat_sessions_update" ON chat_sessions;
CREATE POLICY "chat_sessions_update" ON chat_sessions FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "chat_sessions_delete" ON chat_sessions;
CREATE POLICY "chat_sessions_delete" ON chat_sessions FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Chat messages: via session → workspace → owner
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  USING (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN workspaces w ON cs.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN workspaces w ON cs.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));
-- DELETE for explicit message cleanup (session drop already cascades).
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;
CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE
  USING (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN workspaces w ON cs.workspace_id = w.id
    WHERE w.owner_id = auth.uid()
  ));

-- ============================================================
-- STORAGE  (bucket: synapse-uploads, Public: false)
-- ============================================================
-- Object path convention (see src/app/api/upload/route.ts):
--   "<workspaceId>/<timestamp>_<filename>"
-- so (storage.foldername(name))[1] is always the workspace UUID.
--
-- Run this whole section in the Supabase SQL Editor (it runs as a
-- privileged role, which is required to touch storage.objects policies).

INSERT INTO storage.buckets (id, name, public)
VALUES ('synapse-uploads', 'synapse-uploads', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop EVERY pre-existing policy that references this bucket.
-- Older builds shipped "authenticated"-only policies — any logged-in user
-- could read or delete any other tenant's files (§3.1, CRITICAL).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (COALESCE(qual, '') LIKE '%synapse-uploads%'
        OR COALESCE(with_check, '') LIKE '%synapse-uploads%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "synapse_uploads_select" ON storage.objects;
DROP POLICY IF EXISTS "synapse_uploads_insert" ON storage.objects;
DROP POLICY IF EXISTS "synapse_uploads_update" ON storage.objects;
DROP POLICY IF EXISTS "synapse_uploads_delete" ON storage.objects;

-- Folder-scoped: first path segment must be a workspace the caller owns.
CREATE POLICY "synapse_uploads_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'synapse-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "synapse_uploads_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'synapse-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "synapse_uploads_update" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'synapse-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'synapse-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "synapse_uploads_delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'synapse-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces WHERE owner_id = auth.uid()
  )
);
-- ============================================================
-- Re-verify: sign in as user B, try to GET user A's object path →
-- must return 403 / empty. Repeat for DELETE.
-- ============================================================
