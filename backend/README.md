# Cortex backend

Python service for the document-intelligence pipeline: structural parsing (2),
Google Drive delta sync (3), ACL-aware hybrid retrieval (4). Same Supabase
project as the Next.js app.

Status: **Part 2 — parsing layer.**

| Path | Workstream |
|------|-----------|
| `db/migrations/` | 1 — schema (applied) |
| `models/` | shared Pydantic v2 models |
| `services/parser.py` | 2 — `StructuralDocumentParser` (docling) |
| `services/retrieval.py` | 4 — `RAGOrchestrator` *(pending)* |
| `integrations/gdrive.py` | 3 — Drive connector + delta syncer *(pending)* |
| `tests/` | 5 — pytest harness *(helper unit tests land per part)* |

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
