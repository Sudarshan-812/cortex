"""Part-2 unit tests - framework-agnostic helpers only (no docling, no I/O).
Structural / end-to-end parsing tests land in Part 5."""
import pytest

from models.chunk import Chunk, ChunkMetadata
from services.parser import (
    StructuralDocumentParser,
    UnsupportedFormatError,
    _chunk_confidence,
    _grade_to_score,
    _merge_small,
    _prefix_headings,
)


def test_prefix_headings_breadcrumb_default():
    out = _prefix_headings(["Report", "Q3", "Revenue"], "Net revenue rose 4%.", "breadcrumb")
    assert out == "[Context: Report > Q3 > Revenue]\n\nNet revenue rose 4%."


def test_prefix_headings_markdown_style():
    out = _prefix_headings(["Report", "Q3"], "body", "markdown")
    assert out.splitlines()[:2] == ["# Report", "## Q3"]


def test_prefix_headings_no_headers_is_noop():
    assert _prefix_headings([], "  body  ", "breadcrumb") == "body"


@pytest.mark.parametrize(
    "grade,expected",
    [
        (type("G", (), {"value": "good"})(), 0.85),
        ("EXCELLENT", 0.95),
        ("poor", 0.30),
        (None, None),
    ],
)
def test_grade_to_score(grade, expected):
    assert _grade_to_score(grade) == expected


def test_chunk_confidence_table_penalty_without_grid():
    assert _chunk_confidence(0.9, {}, 1, True, []) == pytest.approx(0.765)


def test_chunk_confidence_prefers_page_grade_and_clamps():
    assert _chunk_confidence(0.9, {2: 0.3}, 2, False, []) == 0.3
    assert 0.0 <= _chunk_confidence(5.0, {}, None, False, []) <= 1.0


def test_merge_small_joins_short_adjacent_same_headers():
    md = ChunkMetadata(page_number=1, headers=["A"], is_table=False)
    merged = _merge_small(
        [
            Chunk(text="short one.", metadata=md, confidence=0.9),
            Chunk(text="short two.", metadata=md, confidence=0.8),
        ],
        min_chars=220,
        max_chars=1800,
    )
    assert len(merged) == 1 and merged[0].confidence == 0.8


def test_merge_small_keeps_tables_separate():
    chunks = [
        Chunk(
            text="| a | b |",
            metadata=ChunkMetadata(headers=["A"], is_table=True),
            confidence=1.0,
        ),
        Chunk(
            text="para",
            metadata=ChunkMetadata(headers=["A"], is_table=False),
            confidence=1.0,
        ),
    ]
    assert len(_merge_small(chunks, 220, 1800)) == 2


def test_unsupported_extension_rejected():
    with pytest.raises(UnsupportedFormatError):
        StructuralDocumentParser().parse(b"x", filename="notes.txt")


def test_bytes_without_filename_rejected():
    with pytest.raises(UnsupportedFormatError):
        StructuralDocumentParser().parse(b"x")


def test_chunkmetadata_forbids_extra_keys():
    with pytest.raises(Exception):
        ChunkMetadata(page_number=1, bogus=True)
