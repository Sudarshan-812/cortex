# Cortex — Setup & Migration Notes

Manual steps that go with the code changes in `LAUNCH.md`. Do these in order per
section. Everything here is a dashboard / one-off action — the code is already in
the repo.

---

## Section 3 — Launch blockers

### 3.1 + 3.2  Database & Storage RLS  (`schema.sql`)

`schema.sql` now contains the fixed policies. Apply to your Supabase project:

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Paste and run the two changed blocks from `schema.sql` (safe to run the whole
   file — every statement is `IF NOT EXISTS` / `DROP ... IF EXISTS` guarded):
   - The `document_chunks` section — adds `chunks_update` + `chunks_delete`
     policies (previously missing, so re-embed / cleanup silently failed under RLS).
   - The `chat_messages` section — adds the `answered_from TEXT` column.
   - The **STORAGE** section — this is the critical fix:
     - creates the `synapse-uploads` bucket if absent,
     - the `DO $$ ... $$` block **drops every existing policy that mentions
       `synapse-uploads`** (the old "authenticated-only" policies that allowed
       cross-tenant read/delete),
     - creates folder-scoped `SELECT / INSERT / UPDATE / DELETE` policies keyed on
       `(storage.foldername(name))[1] = <a workspace you own>`.
   - The storage block must run as a privileged role — the SQL Editor does this by
     default. It will fail from a normal client connection; that's expected.

3. **Re-verify cross-tenant isolation with two accounts:**
   - Account A: upload a file, copy its object path from the `documents` row
     (`storage_path`, looks like `‹workspaceId›/1699…_file.pdf`).
   - Account B (different login): in the browser devtools console on the app, or via
     `curl` with B's access token, request:
     `GET {SUPABASE_URL}/storage/v1/object/synapse-uploads/‹A's path›`
   - Expected: **`400 / 403 / "Object not found"`**. Before the fix this returned the
     file bytes.
   - Repeat for `DELETE` on the same path — must also be denied.
   - In the SQL editor, as B, `SELECT * FROM storage.objects WHERE bucket_id =
     'synapse-uploads'` should return only B's rows.

### 3.2  Run the security review

The `LAUNCH.md` checklist calls for a full `/security-review` before launch. This is
user-triggered from the Claude Code prompt — run:

```
/security-review
```

after this section's changes are committed, and triage anything it reports.

### 3.2  Grounding guardrail — behaviour change to be aware of

`src/app/api/chat/route.ts` no longer answers from un-grounded Gemini. When neither
document retrieval nor the web-search fallback returns usable context, the assistant
now replies with a fixed "I couldn't find anything about this in your documents…"
message and stores it with `answered_from = 'none'`. Web-sourced answers are told to
prefix themselves with "According to a web search:" and every assistant message now
carries an `answered_from` badge in the UI (`documents` / `web` / `both` / `none`).

No env or dashboard change needed — just don't be surprised that some previously
"helpful" ungrounded answers now decline.

### 3.2  README license

`README.md` license section changed from "portfolio piece / no commercial use" to a
proprietary commercial-SaaS notice. No action — noted here for the changelog.

---

## Later sections

Setup notes for §4 (quotas, async ingestion, Stripe) and §6 (Google Drive) will be
added here as those sections land.
