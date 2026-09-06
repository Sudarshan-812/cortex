"""Retrieval-pipeline models (Pydantic v2)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from models.chunk import ChunkMetadata


class RetrievedChunk(BaseModel):
    id: str
    document_id: str
    content: str
    metadata: ChunkMetadata = Field(default_factory=ChunkMetadata)
    source_name: str = "Unknown"
    score: float = 0.0  # fusion / similarity score


class RankedChunk(RetrievedChunk):
    rerank_score: float = 0.0
    rank: int = 0


class CragChunkGrade(BaseModel):
    chunk_id: str
    relevance: float = Field(ge=0.0, le=1.0)


class CragVerdict(BaseModel):
    grades: list[CragChunkGrade] = Field(default_factory=list)
    mean_relevance: float = 0.0
    action: Literal["answer", "rewrite"] = "answer"
    rewritten_query: str | None = None


class Citation(BaseModel):
    chunk_id: str
    source_name: str
    page_number: int | None = None


class QueryRequest(BaseModel):
    query: str = Field(min_length=1)
    workspace_id: str | None = None
    session_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)
