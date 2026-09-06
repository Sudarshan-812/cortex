-- ============================================================
-- 0002 — OAuth connector accounts + per-folder Drive sync cursor
-- Idempotent. Vault stores refresh tokens; we keep only the secret id.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One OAuth connector per (user, provider). refresh_token_secret_id -> vault.secrets.id
CREATE TABLE IF NOT EXISTS connector_accounts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  workspace_id             UUID NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE,
  provider                 TEXT NOT NULL DEFAULT 'gdrive' CHECK (provider IN ('gdrive')),
  external_account_email   TEXT,
  refresh_token_secret_id  UUID,
  access_token             TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  scopes                   TEXT[],
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- Per-folder delta cursor.
CREATE TABLE IF NOT EXISTS drive_sync_state (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_account_id UUID NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
  folder_id            TEXT NOT NULL,
  last_synced_at       TIMESTAMPTZ,
  last_run_at          TIMESTAMPTZ,
  last_status          TEXT,
  last_report          JSONB,
  UNIQUE (connector_account_id, folder_id)
);

CREATE INDEX IF NOT EXISTS connector_accounts_workspace_idx ON connector_accounts (workspace_id);

ALTER TABLE connector_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_sync_state   ENABLE ROW LEVEL SECURITY;

-- Backend connects with the service role (bypasses RLS); these guard the
-- anon/authenticated client if the Next.js app ever reads them.
DROP POLICY IF EXISTS connector_accounts_owner ON connector_accounts;
CREATE POLICY connector_accounts_owner ON connector_accounts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS drive_sync_state_owner ON drive_sync_state;
CREATE POLICY drive_sync_state_owner ON drive_sync_state FOR ALL
  USING (connector_account_id IN (SELECT id FROM connector_accounts WHERE user_id = auth.uid()))
  WITH CHECK (connector_account_id IN (SELECT id FROM connector_accounts WHERE user_id = auth.uid()));

INSERT INTO schema_migrations (version) VALUES ('0002_connector_accounts_and_sync_state')
  ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================
-- ROLLBACK (manual)
--   DROP TABLE IF EXISTS drive_sync_state;
--   DROP TABLE IF EXISTS connector_accounts;
--   DELETE FROM schema_migrations WHERE version = '0002_connector_accounts_and_sync_state';
-- ============================================================
