"""Standardized parser output models (Pydantic v2)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ChunkMetadata(BaseModel):
    """Serializes 1:1 into document_chunks.metadata (migration 0001)."""

    page_number: int | None = Field(
        default=None,
        ge=1,
        description="1-based source page; None for page-less formats (DOCX/XLSX).",
    )
    headers: list[str] = Field(
        default_factory=list,
        description="Section-heading path from document root to this chunk, outermost first.",
    )
    is_table: bool = Field(
        default=False, description="True when `text` is a Markdown table export."
    )

    model_config = {"extra": "forbid"}


class Chunk(BaseModel):
    """One retrieval unit. `text` already has its heading context prepended."""

    text: str = Field(min_length=1)
    metadata: ChunkMetadata = Field(default_factory=ChunkMetadata)
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Parser confidence (docling quality grade, table-structure aware).",
    )

    @property
    def char_count(self) -> int:
        return len(self.text)


class ParsedDocument(BaseModel):
    """Full parse result; `chunks` is the canonical Part-2 output."""

    chunks: list[Chunk]
    markdown: str = ""
    page_count: int = 0
    title: str | None = None
    source_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
