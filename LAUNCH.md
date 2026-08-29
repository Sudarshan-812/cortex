# Cortex — Launch Readiness & Upgrade Plan

> Full codebase audit + launch plan. Work top-down: **Section 3 (must-fix)** blocks launch,
> **Section 4** is the ordered upgrade queue, **Section 5** is go-to-market, **Section 6** is Google Drive.
> Check items off as you ship them.

_Last reviewed: 2026-08-29_

---

## 0. What Cortex is (baseline)

A **RAG "chat with your documents" SaaS**.

Pipeline: upload PDF/DOCX/CSV/TXT/MD → chunk → embed (`gemini-embedding-001`, 768-dim) →
store in Supabase `pgvector` + Postgres FTS → hybrid retrieval fused with **Reciprocal Rank Fusion** →
Gemini **rerank** → **agentic web-search fallback** (Tavily) → **SSE token streaming** with citations.

Also has: workspaces, chat history, analytics dashboard, knowledge graph, rate limiting (Upstash),
error tracking (Sentry), product analytics (PostHog).

**Verdict:** Above-average solo build. The retrieval pipeline (hybrid + RRF + LLM rerank + tool-use
web fallback) is more sophisticated than most ChatPDF clones. It is a strong **MVP**, not yet a
**launchable SaaS**.

---

## 1. Is it good and complete?

**Good: yes. Complete as a SaaS: no.**

| Area | Status | Note |
|---|---|---|
| Retrieval architecture | ✅ Strong | Hybrid + RRF + rerank + agentic web fallback |
| Auth | ✅ OK | Supabase, Google OAuth + email/pw. No MFA/SSO surfaced. |
| RLS (DB tables) | ✅ Mostly | Owner-scoped policies present |
| **Storage bucket policies** | 🔴 Broken | Cross-tenant file read/delete — see §3.1 |
| Billing / plans / metering | ❌ None | Only a 20 req/min rate limit |
| Per-user cost controls | ❌ None | Uploads/queries hit your Gemini key uncapped |
| Async ingestion | ❌ None | Synchronous in serverless fn — will time out |
| Teams | ⚠️ Stub | `workspace_members` table exists, nothing wired |
| Grounding guarantee | ⚠️ Leaky | Falls back to un-grounded Gemini when retrieval empty |
| Tests | ❌ None | Commits say "Test fixes" but no test files exist |
| Legal (ToS/Privacy/DPA) | ❌ None | README license says "no commercial use" |
| File coverage | ⚠️ Limited | Text-only PDF, no OCR, no pptx/xlsx, no page mapping |
| Email flow | ⚠️ Dead | `RESEND_API_KEY` / `REPORT_OWNER_EMAIL` in env, unused |

---

## 2. Can it launch and become a real SaaS?

- **Tech foundation:** yes — real, working, deployed.
- **As a horizontal "chat with your docs" product:** very hard. Saturated category
  (NotebookLM, ChatPDF, Humata, AnythingLLM, Onyx/Danswer, Glean, +dozens). Generic RAG has
  ~no moat and consumers have ~no willingness to pay.
- **As a focused vertical / workflow tool:** plausible. Needs a **wedge** — one persona whose
  problem it solves 10x better:
  - [ ] Legal — contract review, clause comparison, obligation extraction
  - [ ] Research — grad students / R&D teams over paper libraries
  - [ ] Finance — analysts over filings & reports
  - [ ] Ops / Compliance — SOC2 evidence, policy Q&A
  - [ ] Support — internal KB answering
- [ ] **Action: pick ONE wedge and talk to 10–15 of those people before building more.**

---

## 3. 🔴 Must-fix before ANY real users (launch blockers)

### 3.1 Cross-tenant file access via Storage policies — CRITICAL

`schema.sql` lines ~237–239. Current bucket policies:

```
INSERT / SELECT / DELETE: (bucket_id = 'synapse-uploads') AND (auth.role() = 'authenticated')
```

**Any authenticated user can read or delete any other tenant's uploaded files.** Only gated by
"are you logged in," not "is this your workspace." Path is `${workspaceId}/${timestamp}_${name}`
(UUID = not trivially enumerable, but still a real multi-tenant data leak and a hard blocker).

- [ ] Replace all three Storage policies with folder-scoped versions:

```sql
-- SELECT (repeat shape for INSERT WITH CHECK and DELETE USING)
CREATE POLICY "synapse_uploads_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'synapse-uploads'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM workspaces WHERE owner_id = auth.uid()
  )
);
```

- [ ] Re-verify with two accounts: user B must get 403 on user A's object path.

### 3.2 Other must-fix

- [ ] **Run `/security-review`** on the whole repo before launch.
- [ ] Add missing RLS on `document_chunks` — no `UPDATE` / `DELETE` policy today.
- [ ] **Grounding guardrail** (`src/app/api/chat/route.ts` ~line 245): when retrieval returns
      nothing, respond "I couldn't find this in your documents" instead of
      `"Answer this question as helpfully as possible"`. Label web-search answers explicitly.
      (Current behavior contradicts the README "eliminate hallucinations" claim.)
- [ ] **Persist assistant message on stream disconnect** — if the client drops mid-stream,
      `fullText` may never be written to `chat_messages`. Flush partial on `cancel()`/abort.
- [ ] **Per-user usage quotas** (see §4.2) — cannot safely open signups without this.
- [ ] **Legal pages** — ToS, Privacy Policy, subprocessor list (Google, Supabase, Tavily,
      Upstash, Sentry, PostHog), data-deletion path. Change `README.md` license from
      "All Rights Reserved / no commercial use / portfolio piece."

---

## 4. Upgrade queue (priority order)

### 4.1 Fix Storage RLS leak
- [ ] Done in §3.1

### 4.2 Per-user usage quotas + metering
- [ ] New table `usage_limits` (plan, pages_limit, queries_per_day, storage_bytes_limit).
- [ ] New table / counter `usage_events` (user_id, kind, qty, cost_estimate, created_at).
- [ ] Enforce on upload (pages/storage) and on `POST /api/chat` (queries/day) — return 402/429
      with a clear message when exceeded.
- [ ] Surface remaining quota in the dashboard header.

### 4.3 Async ingestion pipeline
- [ ] Add a queue — QStash (you already have Upstash) or Inngest.
- [ ] `POST /api/upload` only: store file + `documents` row with `status = 'queued'`, return 202.
- [ ] Worker: extract → chunk → embed → insert chunks → `status = 'ready'`; on failure
      `status = 'failed'` + error, with retry/backoff.
- [ ] Add `status` column to `documents`; show per-doc state in `DocumentTable`.
- [ ] Clean up orphan docs (row exists, zero chunks) on failure.
- [ ] Delete the synchronous path in `src/app/actions.ts::uploadDocument` (or make it enqueue).

### 4.4 Billing (Stripe)
- [ ] Stripe Checkout + customer portal + webhook (`checkout.session.completed`,
      `customer.subscription.updated/deleted`).
- [ ] `subscriptions` table; map plan → quotas in §4.2.
- [ ] Free tier (e.g. 50 pages, 20 queries/day, 1 workspace) → Pro.
- [ ] Gate features + quotas off the active plan.

### 4.5 Grounding + citations quality
- [ ] Grounding guardrail (also in §3.2).
- [ ] Parse PDFs **per page**; carry `page` into chunk metadata; show page in source citations.
- [ ] "Answered from web" vs "Answered from your documents" badge on each message.

### 4.6 Retrieval evals
- [ ] Build 30–50 Q/A pairs from real docs.
- [ ] Script to score retrieval (hit@k, MRR) + answer faithfulness.
- [ ] Run before/after every retrieval change. (Right now you're blind on the core feature.)

### 4.7 Decide on teams
- [ ] Either: wire `workspace_members` into every RLS policy (membership, not just `owner_id`)
      **and** build invite-by-email (Resend) + accept flow + role checks in server actions.
- [ ] Or: drop `workspace_members`, market as single-player, revisit later.

### 4.8 Observability / cost
- [ ] Structured per-request log: tokens in/out, embed calls, latency, $ estimate, workspace_id.
- [ ] PostHog: define **activation = "first cited answer from user's own doc"**; dashboard for
      activation rate + week-1 retention.
- [ ] Alert when cost-per-active-user approaches price.

### 4.9 File types / ingestion breadth
- [ ] OCR for scanned PDFs (e.g. Google Document AI / Tesseract worker).
- [ ] `pptx`, `xlsx`, pasted URLs / web pages.
- [ ] Connectors: Google Drive (§6), later Notion / Slack / Dropbox.

### 4.10 pgvector tuning
- [ ] Evaluate HNSW vs current IVFFlat (`lists = 100`).
- [ ] `ANALYZE document_chunks` after bulk inserts; revisit `lists`/`ef_search` as data grows.
- [ ] Re-embed migration path (the `embedding_model` column is tracked but unused).

### 4.11 Tests
- [ ] Unit: `src/lib/parsers.ts`, `src/lib/timeline.ts`, RRF SQL function.
- [ ] Integration: upload → retrieve → answer happy path.
- [ ] RLS tests: user B cannot read user A's rows or files.

---

## 5. Go-to-market

1. [ ] **Choose the wedge** (§2). Everything below assumes one niche.
2. [ ] **Customer discovery** — 10–15 conversations: what they use now, what's broken, would they pay.
3. [ ] **Ship launch-blockers** (§3) + quotas + async + Stripe + legal pages.
4. [ ] **Recruit 5–10 design partners** on a cheap paid plan; iterate weekly.
5. [ ] **Instrument activation** in PostHog; track activation rate + week-1 retention over vanity metrics.
6. [ ] **Soft launch**: your network → the specific community for the niche (subreddit, Slack/Discord, forum).
7. [ ] **Public launch**: Show HN, Product Hunt, niche subreddit, LinkedIn/X, indie directories.
8. [ ] **SEO/content**: one landing page per use case ("chat with your contracts", "chat with research
   papers"), plus comparison pages ("Cortex vs NotebookLM for X").
9. [ ] **Unit economics**: track cost per active user vs price. If a free user can cost $5/mo in
   embeddings, the free tier is wrong.
10. [ ] **Expectation**: nights-and-weekends launch; months to meaningful revenue. Build quality
    justifies trying — *with* a narrow focus.

**Metrics to watch:** activation rate, week-1 retention, docs uploaded per active user,
queries per user, cost per user vs price.

---

## 6. Google Drive integration — yes, phased

Manual upload is the biggest friction in this category. A Drive connector is table-stakes for the
B2B version and a real differentiator over pure-upload tools.

### Phase 1 — Import (do first)
- [ ] Google Picker + OAuth scope **`drive.file`** (only files the user explicitly picks).
- [ ] Feed picked files into the existing pipeline (`extractText` → chunk → embed).
- [ ] **Avoid `drive.readonly`** until forced — full-Drive read triggers Google's annual **CASA
  security assessment** (costs money + work) once you're a verified prod app with many users.

### Phase 2 — Live sync (Pro feature)
- [ ] Drive `changes` API + push webhooks.
- [ ] Re-embed changed files, remove deleted ones.
- [ ] This is where "infuse my Cortex in Drive" becomes real — KB stays current, not a stale snapshot.

### Phase 3 — Permission mirroring (only on demand)
- [ ] Respect Drive sharing per user. Hard. Build only when an enterprise customer requires it.

### Cost gate
- [ ] Auto-syncing a whole Drive is a large embedding bill. Cap by plan (folder count, file count);
  always let the user select scope.

### "Something cool and unique" — pick ONE, tie it to the wedge
- [ ] **Self-updating second brain** — KB synced to Drive/Notion/Slack; every answer shows
  source + page + "last synced 2h ago." Competitors are stale snapshots.
- [ ] **Change digests** — scheduled agent over the KB: *"3 documents changed this week that
  affect [payment terms] — here's what's new."* Proactive, not just reactive Q&A.
- [ ] **Cross-document contradiction / gap detection** — *"These two contracts disagree on the
  renewal clause."* High value in legal/ops, rare in competitors, reuses your retrieval + rerank stack.
- [ ] **Slack bot** answering from the Drive-synced KB in-channel — meet B2B buyers where they work.
- [ ] **Query-driven knowledge map** — the existing `KnowledgeGraph`, but edges from real query
  co-occurrence instead of topic tags.

**Recommendation:** Drive import (Picker + `drive.file`) is the right next feature **after** the
security/billing/async work — not before. Make live sync the headline Pro capability. Pick
contradiction-detection or change-digests as the unique hook (both reuse existing infra).

---

## 7. Quick reference — files touched per upgrade

| Upgrade | Primary files |
|---|---|
| Storage RLS | `schema.sql` (Storage policies section) |
| Chunk RLS | `schema.sql` |
| Grounding guardrail | `src/app/api/chat/route.ts` |
| Stream disconnect persist | `src/app/api/chat/route.ts` |
| Usage quotas | new migration + `src/app/api/upload/route.ts` + `src/app/api/chat/route.ts` |
| Async ingestion | `src/app/api/upload/route.ts`, `src/app/actions.ts`, new worker route, `schema.sql` |
| Billing | new `src/app/api/stripe/*`, `src/app/dashboard/settings/*`, `schema.sql` |
| Per-page citations | `src/lib/parsers.ts`, `src/app/api/upload/route.ts`, `src/components/chat-window.tsx` |
| Teams | `schema.sql` (all RLS), `src/app/actions.ts`, new invite route |
| Drive import | new `src/app/api/drive/*`, `src/components/dashboard/UploadZoneNew.tsx` |

---

## 8. Feature ideas backlog

Beyond §4 / §6. Grouped by whether they build a moat / justify paying vs. cheap marketing wins.

### Moat / willingness-to-pay
- [ ] **Bulk extraction** — one question across N documents → table of answers per doc (CSV/JSON export).
      Huge for finance/legal/ops due diligence.
- [ ] **Structured field extraction** — pull defined fields/tables out of a document set into a schema.
- [ ] **Cross-doc contradiction & gap detection** — "these two contracts disagree on X".
- [ ] **Team knowledge-gap analytics** — "18 people asked about refunds, no document answers it".
- [ ] **Live connectors + sync** — Drive → Notion → Slack → Dropbox. Sync = retention.
- [ ] **Shareable knowledge pages** — publish a read-only Q&A / curated answer set via public link.
- [ ] **API access** (Pro+) — query your KB programmatically.
- [ ] **Vertical prompt templates / "skills"** — "Extract all obligations", "Summarize as board memo".
- [ ] **Confidence score + show-your-work** — which chunks, what scores, why.
- [ ] **PII detection / redaction on upload** — compliance selling point.
- [ ] **Version history / diff** on re-uploaded documents.
- [ ] **Workspace persona / system prompt** — tune tone + domain per workspace.

### Cheap marketing wins
- [ ] **Audio overview** (NotebookLM-style) of a doc set via Gemini TTS.
- [ ] **Chrome extension** — "ask Cortex about this page / this PDF".
- [ ] **Email-to-ingest** — forward attachments to a per-workspace address.
- [ ] **Slack/Teams bot**.
- [ ] **Deep-link PDF viewer** — citation opens the source at the exact highlight (extend `DocumentReaderPanel`).
- [ ] **Export answer** as formatted Word/PDF/Notion.
- [ ] **Multi-language** Q&A (matters if targeting non-English or India vernacular).
- [ ] **Scheduled digests / change alerts** (needs connectors).

**Priority pick:** Bulk extraction + contradiction detection + team knowledge-gap analytics are the
three that make Cortex a *tool people expense*, not a toy. Ship one, tied to your wedge.

---

## 9. Competitors

### Direct — horizontal "chat with docs"
| Competitor | Notes |
|---|---|
| **Google NotebookLM** | Free, very strong, consumer + NotebookLM Plus. The gorilla. **Kills consumer pricing.** |
| ChatPDF | Simple, cheap (~$5–20), consumer |
| Humata AI | Research/legal lean, freemium |
| AnythingLLM (Mintplex) | Open source, self-host |
| Onyx / Danswer | Open source, enterprise connectors, self-host |
| PDF.ai, ChatDOC, AskYourPDF, Documind | Long tail of thin wrappers |
| Notion AI / Notion Q&A | If docs already live in Notion |
| ChatGPT (file upload / GPTs), Claude Projects | **Platform risk — general assistants keep eating this** |

### Enterprise knowledge assistants
Glean (well-funded, $$$$), Sana AI, Guru, Dashworks, Slite AI.

### Research-specific
Elicit, Scholarcy, Sider, SciSpace.

### Vertical (where independents survive)
- Legal: Harvey, Robin AI, Spellbook, Luminance
- Finance: Hebbia, AlphaSense, Rogo
- Support/CS: Pylon, Forethought

### India
Few India-first RAG SaaS (mostly agencies / generic agent platforms, Zoho Zia is adjacent).
Gap exists for India compliance / vernacular, but low willingness to pay.

**Takeaway:** Horizontal is brutally crowded and NotebookLM being free caps consumer pricing.
Vertical + workflow + connectors is the only defensible lane for an independent.

---

## 10. Growth potential

- **Market:** enterprise RAG / knowledge management is real and growing (AI-doc-processing tailwind).
- **As a solo/small horizontal product:** low ceiling — NotebookLM + platform bundling risk.
- **Realistic:** a focused niche B2B SaaS can reach ~$5k–50k MRR over 1–2 years with real sales effort.
- **Venture-scale:** unlikely without a sharp vertical wedge + a data/workflow moat.
- **Levers that actually compound here:** connectors/sync (retention), team seats (expansion revenue),
  vertical templates, API.
- **Honest verdict:** strong potential as a bootstrapped/indie B2B business; not as a standalone
  venture unless verticalized.

---

## 11. Which market to target

| Factor | India | US / UK / EU / AUS |
|---|---|---|
| SaaS willingness to pay | Low — $20/mo is a hard sell | US highest; UK/EU/AUS similar |
| Your costs (Gemini/Supabase/Vercel) | USD regardless | USD — matches revenue |
| Payments | Razorpay/PayU (Stripe India limited) | Stripe / Paddle / Lemon Squeezy |
| Online distribution (PH, HN, Reddit, SEO) | Weak for paid conversion | Strong |

**Recommendation:**
- **Primary: US. Price and bill in USD.** Sell globally from day one — do not geo-restrict; UK/EU/AUS
  buyers convert at similar price points.
- **India = secondary / opportunistic.** If Indian traction appears, add a PPP (INR) tier ~40–60% off
  via Razorpay — don't build India-first.
- **Exception:** if the wedge is inherently Indian (Indian legal, GST/compliance, vernacular docs),
  then go India-first and price in ₹ with volume assumptions.
- Being based in India is a **cost advantage** for building + support — point the product at USD demand.

---

## 12. Legal requirements

You process user-uploaded documents (often personal/confidential) → you are a data processor.
Obligations scale with where customers are.

### India — DPDP Act 2023
In force with phased rollout. If you have Indian users / an Indian entity:
- [ ] Consent + clear notice at collection; purpose limitation
- [ ] In-product data erasure + a grievance/contact officer
- [ ] Breach notification to the Data Protection Board
- Cross-border transfer currently allowed except to (not-yet-named) restricted countries — US-hosted
  Supabase/Vercel is presently OK; monitor notifications
- Significant Data Fiduciary obligations only apply at high volume/sensitivity — not you early

### EU / UK — GDPR / UK GDPR (any EU/UK customer)
- [ ] Privacy policy, lawful basis, cookie/analytics consent (PostHog)
- [ ] DPA you sign with customers + public sub-processor list
      (Google, Supabase, Vercel, Upstash, Tavily, Sentry, PostHog)
- [ ] SCCs / Data Privacy Framework reliance for US transfer
- [ ] Access / delete / export rights honored in-product
- [ ] Art. 27 EU representative once real EU volume

### US
- No federal law. **CCPA/CPRA** at scale (write policy to comply anyway).
- Avoid **HIPAA** (healthcare) / **PCI** (card data) verticals until you can sign BAAs / certify.
- **SOC 2 Type II** — not law, but mid-market buyers demand it. ~$15–30k + 6–12 mo; Vanta/Drata
  automate most of it. Start when you begin mid-market sales.

### Australia — Privacy Act / APPs
GDPR-lite + Notifiable Data Breaches scheme. Covered if you build to GDPR grade.

### AI-specific — EU AI Act
Doc Q&A = limited-risk. Just disclose AI use and label AI output.

### Pre-launch legal checklist (covers most of the above)
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] DPA template customers can sign
- [ ] Public sub-processor list
- [ ] In-product data deletion + export
- [ ] Security page (encryption in transit/at rest, RLS, access control)
- [ ] Cookie/analytics consent banner (EU visitors)
- [ ] DPAs signed with YOUR vendors (all offer standard ones)
- [ ] Breach response plan + contact
- [ ] Company entity — US LLC (Stripe Atlas / Firstbase) **or** Indian Pvt Ltd + Razorpay/Paddle
- [ ] **Strongly consider a Merchant of Record (Paddle / Lemon Squeezy)** — they handle global
      sales tax / VAT / GST / invoicing. Removes a large compliance burden for a solo founder.
- [ ] Startup lawyer reviews ToS + DPA before any enterprise deal

_Not legal advice._

---

## 13. Pricing

Model: usage-gated freemium; per-seat for teams; **bill in USD**. Annual = 2 months free (~17%).

| Tier | Price | Includes | Target |
|---|---|---|---|
| **Free** | $0 | 1 workspace/user · ~50 pages · 20 queries/day · 7-day history | Activation funnel. Keep cost < ~$1/mo/user. |
| **Pro** | **$19/mo** ($190/yr) | 1 user · 3 workspaces · ~3–5k pages · ~500 queries/day · Drive import · full history · exports | Prosumers, consultants, researchers |
| **Team** | **$39/user/mo** ($390/user/yr), min 2–3 seats | Shared workspaces · roles · invites · ~25k pooled pages · live Drive/Notion sync · knowledge-gap analytics · Slack bot | Small teams, internal KB |
| **Business** | **from ~$500–2,000/mo, custom** | SSO/SAML · SCIM · audit logs · custom retention · DPA + security review · SLA · dedicated support | Mid-market / enterprise |
| **API add-on** | usage-based ($/1k queries or $/1M tokens) | Pro+ only | Developers |

**Rationale**
- $19 Pro = the AI-prosumer sweet spot (ChatGPT/Claude/Notion AI anchor ~$20). Below $10 reads as a
  toy and won't cover cost against a real free tier; above $30 single-seat needs a vertical ROI story.
- $39/seat Team matches AI-first team knowledge tools ($20–50/seat).
- Enterprise is where the revenue concentrates once SOC 2 + connectors exist.
- **Cost check before finalizing limits:** measure blended $/query (embed + rerank + generate + web
  search). If ~$0.01–0.03/query, 500/day on Pro is worst-case ~$15–45/mo — so cap hard, or push the
  heavy query limits to Team only. See §4.8.

**India / PPP (only if real demand):** ~Free / ₹599 Pro / ₹1,199 per-seat Team via Razorpay.

**Don't:** lifetime deals; a free tier you can't afford; more than ~17% annual discount.

---

## 14. Pivot / adjacent product options

> The idea matters less than the wedge + a cheap way to reach buyers. Any pivot must pass:
> (1) Can you name the first 20 customers and reach them for ~$0?
> (2) Is the pain bad enough that someone pays this quarter?
> (3) Do you have unfair insight or access?
> If a new idea can't clear those, switching won't help.

### A. Reuse the Cortex engine (fastest — ~70–85% of code carries over)

**1. RFP / security-questionnaire auto-responder** ⭐ top pick
Sales & security teams get 150–300 question RFPs and SOC2/vendor questionnaires; answering is
manual hell. Ingest past answers + docs → draft responses with citations → human approves.
- **Buyer:** sales engineers, security/GRC teams. High WTP, obvious ROI (2 days → 2 hours).
- **Competition:** Loopio, Responsive, Vanta — all enterprise-priced. Gap open for SMB/mid-market
  at $99–499/mo.
- **Reach:** cold outbound to "Sales Engineer" / "Security Analyst" titles, r/sales, RevOps communities.

**2. Contract review for SMBs & agencies**
Upload a contract → risk flags, unusual clauses, obligations extracted, redlines vs. your playbook.
- **Buyer:** small law firms, agency ops leads, founders signing MSAs.
- **Competition:** Spellbook, Robin AI — enterprise. Nothing good at $50–150/mo.

**3. Customer-facing "answers" widget with gap analytics**
Embeddable bot on a company's help center + docs. Differentiator: a dashboard of what users ask
that the docs don't answer.
- **Buyer:** support leads, DevRel, PMs. Crowded (kapa.ai, Inkeep) but proven money — the
  gap-analytics angle is underdone.

**4. Data-room / investor-update assistant for startups**
Ingest metrics + docs → auto-draft monthly updates → let investors query the data room.

### B. AI-native, less crowded

**5. DPDP Act / EU AI Act / ISO 42001 compliance automation**
SOC2 is saturated (Vanta, Drata); newer frameworks aren't. Sell "get DPDP-ready" to Indian
companies as the local wedge, expand to AI-governance frameworks globally.
- **Buyer:** Indian startups/SMBs facing DPDP enforcement; any company shipping AI features.

**6. Vertical back-office agent — pick ONE workflow**
Invoice/AP processing for a specific industry, insurance claim intake, freight document processing,
medical prior-auth. Unglamorous, high WTP, defensible via domain edge cases nobody else handles.

**7. AI-first internal-tool builder**
"Describe the ops tool, point at your DB, get a working admin panel." Retool is expensive and not
AI-native. Big market, but hard to build well — higher risk.

### C. Dev tools (cheap distribution, small ACV)

**8. Supabase/Postgres RLS toolkit** — test, visualize, audit RLS policies. You just felt this pain.
Passionate niche, reachable via dev Twitter / Supabase Discord.

**9. Dead-simple RAG/agent eval dashboard** — "is my RAG getting worse?" for small teams that won't
buy Braintrust/Langfuse. You need this for Cortex anyway — build it, dogfood it, sell it.

**10. Auto changelog / release notes from git + PRs + Linear** — PLG, SEO-friendly, low-touch.
Competitors (LaunchNotes, Released) leave the low end open.

### Recommendation

**Don't start from zero — verticalize Cortex into #1 (RFP/questionnaire response) or #2 (contract
review).** Keep the retrieval engine, auth, UI, and infra already built; add a specific buyer with a
budget and a painful, recurring, measurable problem. You go from competing with free NotebookLM to
competing with $30k/yr enterprise tools that ignore small customers — same code, 10x better position.

**Next step:** pick one, do 15 customer calls this week, then decide.
