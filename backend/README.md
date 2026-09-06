# Cortex backend

Python service for the document-intelligence pipeline: structural parsing (2),
Google Drive delta sync (3), ACL-aware hybrid retrieval (4). Same Supabase
project as the Next.js app.

Status: **Part 5 — integration test harness complete (48 tests).**

| Path | Workstream |
|------|-----------|
| `db/migrations/` | schema (`0001`, `0002`) |
| `db/migrate.py` | forward-only runner — `python -m db.migrate` |
| `core/` | settings + shared async HTTP retry |
| `models/` | shared Pydantic v2 models |
| `services/parser.py` | 2 — `StructuralDocumentParser` (docling) |
| `services/embeddings.py` | `GeminiEmbedder` (shared with Part 4) |
| `integrations/gdrive.py` | 3 — Drive client, Vault token store, `DriveSyncer` |
| `services/gemini.py` | 4 — `GeminiStructured` (rerank + CRAG) |
| `services/retrieval.py` | 4 — RRF, `HybridRetriever`, `Reranker`, `CragEvaluator`, `RAGOrchestrator` |
| `services/synthesis.py` | 4 — `GeminiSynthesizer` (streamed answer + citation contract) |
| `api/` | 4 — FastAPI `POST /v1/query` (SSE), Supabase JWT verify |
| `tests/test_pipeline.py` | 5 — integration harness: atomic cleanup, ACL non-leak (rpc+app), rate-limit fallback |
| `tests/_fakes.py` | shared `FakeDB` (ACL predicate + txn snapshot), Drive/HTTP doubles |

Config: copy `.env.example` to `.env`. Migrations `0001`/`0002` apply via
`python -m db.migrate` (or paste the SQL in the Supabase SQL Editor).

## API

    uvicorn api.app:app --port 8000
    # POST /v1/query  { "query": "...", "workspace_id": "...", "top_k": 5 }
    # Header: Authorization: Bearer <supabase access token>  -> SSE stream

Pipeline: hybrid retrieve (RPC `match_hybrid_documents`, or `RETRIEVAL_MODE=app`
for parallel dense+BM25 + Python RRF) → Gemini rerank to Top-K → CRAG relevance
grade (rewrite + re-retrieve once if mean < `CRAG_THRESHOLD`) → answer streamed
from `gemini-2.5-flash` with a `citations` event carrying `chunk_id` /
`source_name` / `page_number`. Every model call is Gemini (free tier) — one
`GEMINI_API_KEY`, no paid API.

## Setup

    cd backend
    python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
    pip install -e ".[dev]"

docling downloads layout/OCR models on the first **PDF** conversion (~400 MB,
cached in `~/.cache/docling`; pre-fetch with `docling-tools models download`).
DOCX/XLSX need no models.

## Test

    pytest

## Usage

    from services.parser import StructuralDocumentParser

    parser = StructuralDocumentParser()
    chunks = parser.parse("report.pdf")                       # -> list[Chunk]
    chunks = parser.parse(pdf_bytes, filename="report.pdf")

`Chunk.text` already has its heading path prepended; `Chunk.metadata`
(`page_number`, `headers`, `is_table`) serializes 1:1 into `document_chunks.metadata`.
