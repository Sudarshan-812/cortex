# Cortex backend

Python service for the document-intelligence pipeline: structural parsing (2),
Google Drive delta sync (3), ACL-aware hybrid retrieval (4). Same Supabase
project as the Next.js app.

Status: **Part 3 — Google Drive connector + delta syncer.**

| Path | Workstream |
|------|-----------|
| `db/migrations/` | 1–3 — schema (`0001`, `0002`) |
| `db/migrate.py` | forward-only runner — `python -m db.migrate` |
| `core/` | settings + shared async HTTP retry |
| `models/` | shared Pydantic v2 models |
| `services/parser.py` | 2 — `StructuralDocumentParser` (docling) |
| `services/embeddings.py` | `GeminiEmbedder` (shared with Part 4) |
| `integrations/gdrive.py` | 3 — Drive client, Vault token store, `DriveSyncer` |
| `services/retrieval.py` | 4 — `RAGOrchestrator` *(pending)* |
| `tests/` | 5 — pytest harness *(helper unit tests land per part)* |

Config: copy `.env.example` to `.env`. Migrations `0001`/`0002` apply via
`python -m db.migrate` (or paste the SQL in the Supabase SQL Editor).

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
