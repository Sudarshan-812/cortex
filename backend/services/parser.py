"""StructuralDocumentParser - docling-backed PDF/DOCX/XLSX parsing.

Each returned `Chunk`:
  * carries its section-heading path in `metadata.headers` AND prepended to `text`,
  * marks tables (`metadata.is_table`) whose `text` is a clean Markdown table,
  * has a `confidence` in [0,1] derived from docling's quality report.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Final

from models.chunk import Chunk, ChunkMetadata, ParsedDocument

logger = logging.getLogger("cortex.parser")

SUPPORTED_EXTENSIONS: Final[frozenset[str]] = frozenset({".pdf", ".docx", ".xlsx"})

_GRADE_TO_SCORE: Final[dict[str, float]] = {
    "excellent": 0.95,
    "good": 0.85,
    "fair": 0.60,
    "poor": 0.30,
    "unspecified": 0.50,
}
_DEFAULT_CONFIDENCE: Final[float] = 0.80


class DocumentParseError(RuntimeError):
    """docling failed to convert the source."""


class UnsupportedFormatError(ValueError):
    """Extension outside SUPPORTED_EXTENSIONS, or bytes given without a filename."""


@dataclass(slots=True)
class _Settings:
    max_chunk_chars: int = 1800
    min_merge_chars: int = 220
    tables_as_own_chunk: bool = True
    heading_style: str = "breadcrumb"  # "breadcrumb" -> "[Context: A > B]"; "markdown" -> "## B"


class StructuralDocumentParser:
    def __init__(
        self,
        *,
        max_chunk_chars: int = 1800,
        min_merge_chars: int = 220,
        tables_as_own_chunk: bool = True,
        heading_style: str = "breadcrumb",
    ) -> None:
        self._s = _Settings(
            max_chunk_chars, min_merge_chars, tables_as_own_chunk, heading_style
        )
        self._converter = None  # lazy: docling import + model warmup is heavy

    # ---- public API -----------------------------------------------------

    def parse(self, source: str | Path | bytes, *, filename: str | None = None) -> list[Chunk]:
        return self.parse_document(source, filename=filename).chunks

    def parse_document(
        self, source: str | Path | bytes, *, filename: str | None = None
    ) -> ParsedDocument:
        ext = self._resolve_ext(source, filename)
        if ext not in SUPPORTED_EXTENSIONS:
            raise UnsupportedFormatError(f"{ext!r} not in {sorted(SUPPORTED_EXTENSIONS)}")

        result = self._convert(source, ext, filename)
        doc = result.document

        markdown = _safe(lambda: doc.export_to_markdown(), "")
        page_count = _safe(lambda: doc.num_pages(), 0) or _pages_from_result(result)
        title = _safe(lambda: doc.name, None) or (Path(filename).stem if filename else None)
        doc_conf, page_conf = _confidence_table(result)

        chunks = self._build_chunks(result, doc_conf, page_conf)
        logger.info(
            "parsed %s: %d chunks, %d pages, conf=%.2f",
            filename or ext,
            len(chunks),
            page_count,
            doc_conf,
        )
        return ParsedDocument(
            chunks=chunks,
            markdown=markdown,
            page_count=page_count,
            title=title,
            source_confidence=doc_conf,
        )

    # ---- docling plumbing ---------------------------------------------

    def _get_converter(self):
        if self._converter is not None:
            return self._converter
        try:
            from docling.datamodel.base_models import InputFormat
            from docling.document_converter import DocumentConverter
        except Exception as exc:  # noqa: BLE001
            raise DocumentParseError(
                "docling not installed. `pip install -e 'backend[dev]'` or `pip install docling`."
            ) from exc
        self._converter = DocumentConverter(
            allowed_formats=[InputFormat.PDF, InputFormat.DOCX, InputFormat.XLSX]
        )
        return self._converter

    def _convert(self, source, ext, filename):
        converter = self._get_converter()
        try:
            if isinstance(source, bytes):
                return converter.convert(_make_stream(filename or f"upload{ext}", source))
            return converter.convert(str(source))
        except Exception as exc:  # noqa: BLE001
            raise DocumentParseError(f"docling failed on {filename or source!r}: {exc}") from exc

    # ---- chunking -----------------------------------------------------

    def _build_chunks(self, result, doc_conf, page_conf) -> list[Chunk]:
        try:
            from docling_core.transforms.chunker.hierarchical_chunker import HierarchicalChunker
        except Exception:  # noqa: BLE001
            HierarchicalChunker = None  # type: ignore
        if HierarchicalChunker is not None:
            try:
                return self._chunks_via_docling(
                    result, HierarchicalChunker(), doc_conf, page_conf
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("docling chunker failed (%s); using item walk", exc)
        return self._chunks_via_item_walk(result, doc_conf, page_conf)

    def _chunks_via_docling(self, result, chunker, doc_conf, page_conf) -> list[Chunk]:
        doc = result.document
        out: list[Chunk] = []
        for ck in chunker.chunk(doc):
            meta = ck.meta
            headings = [h for h in (getattr(meta, "headings", None) or []) if h]
            items = list(getattr(meta, "doc_items", []) or [])
            is_table = any(_is_table_item(it) for it in items)
            page_no = _first_page(items)
            body = (_table_markdown(doc, items) or ck.text) if is_table else ck.text
            text = _prefix_headings(headings, body, self._s.heading_style)
            if not text.strip():
                continue
            out.append(
                Chunk(
                    text=text,
                    metadata=ChunkMetadata(
                        page_number=page_no, headers=headings, is_table=is_table
                    ),
                    confidence=_chunk_confidence(
                        doc_conf, page_conf, page_no, is_table, items
                    ),
                )
            )
        return _merge_small(out, self._s.min_merge_chars, self._s.max_chunk_chars)

    def _chunks_via_item_walk(self, result, doc_conf, page_conf) -> list[Chunk]:
        doc = result.document
        header_stack: list[tuple[int, str]] = []
        buf: list[str] = []
        buf_page: int | None = None
        out: list[Chunk] = []

        def flush() -> None:
            nonlocal buf, buf_page
            body = "\n".join(b for b in buf if b.strip())
            if body.strip():
                headings = [h for _, h in header_stack]
                out.append(
                    Chunk(
                        text=_prefix_headings(headings, body, self._s.heading_style),
                        metadata=ChunkMetadata(
                            page_number=buf_page, headers=headings, is_table=False
                        ),
                        confidence=_chunk_confidence(
                            doc_conf, page_conf, buf_page, False, []
                        ),
                    )
                )
            buf, buf_page = [], None

        for item, level in doc.iterate_items():
            page_no = _first_page([item])
            text = (getattr(item, "text", "") or "").strip()

            if _is_heading_item(item):
                flush()
                while header_stack and header_stack[-1][0] >= level:
                    header_stack.pop()
                if text:
                    header_stack.append((level, text))
                continue

            if _is_table_item(item):
                flush()
                headings = [h for _, h in header_stack]
                md = _table_markdown(doc, [item]) or text
                if md.strip():
                    out.append(
                        Chunk(
                            text=_prefix_headings(headings, md, self._s.heading_style),
                            metadata=ChunkMetadata(
                                page_number=page_no, headers=headings, is_table=True
                            ),
                            confidence=_chunk_confidence(
                                doc_conf, page_conf, page_no, True, [item]
                            ),
                        )
                    )
                continue

            if not text:
                continue
            if buf_page is None:
                buf_page = page_no
            buf.append(text)
            if sum(len(b) for b in buf) >= self._s.max_chunk_chars:
                flush()
        flush()
        return _merge_small(out, self._s.min_merge_chars, self._s.max_chunk_chars)

    # ---- misc -------------------------------------------------------

    @staticmethod
    def _resolve_ext(source, filename) -> str:
        if filename:
            return Path(filename).suffix.lower()
        if isinstance(source, (str, Path)):
            return Path(source).suffix.lower()
        raise UnsupportedFormatError("bytes source requires filename= to determine format")


# ---- module helpers -----------------------------------------------------


def _prefix_headings(headings: list[str], body: str, style: str) -> str:
    body = body.strip()
    if not headings:
        return body
    if style == "markdown":
        lines = [f"{'#' * min(i + 1, 6)} {h}" for i, h in enumerate(headings)]
        return "\n".join([*lines, "", body]).strip()
    return f"[Context: {' > '.join(headings)}]\n\n{body}".strip()


def _is_table_item(it) -> bool:
    lbl = getattr(it, "label", None)
    return str(getattr(lbl, "value", lbl)).lower() == "table"


def _is_heading_item(it) -> bool:
    lbl = getattr(it, "label", None)
    return str(getattr(lbl, "value", lbl)).lower() in {"section_header", "title", "subtitle"}


def _table_markdown(doc, items) -> str:
    for it in items:
        exporter = getattr(it, "export_to_markdown", None)
        if exporter is None:
            continue
        for call in (lambda: exporter(doc), lambda: exporter()):
            try:
                md = call()
                if md and md.strip():
                    return md
            except TypeError:
                continue
            except Exception:  # noqa: BLE001
                return ""
    return ""


def _first_page(items) -> int | None:
    for it in items:
        for prov in getattr(it, "prov", None) or []:
            pno = getattr(prov, "page_no", None)
            if isinstance(pno, int) and pno >= 1:
                return pno
    return None


def _confidence_table(result) -> tuple[float, dict[int, float]]:
    rep = getattr(result, "confidence", None)
    if rep is None:
        return _DEFAULT_CONFIDENCE, {}
    doc_score = _grade_to_score(getattr(rep, "mean_grade", None)) or _DEFAULT_CONFIDENCE
    pages: dict[int, float] = {}
    for pno, pinfo in (getattr(rep, "pages", None) or {}).items():
        s = _grade_to_score(getattr(pinfo, "mean_grade", None))
        if s is not None:
            pages[int(pno)] = s
    return doc_score, pages


def _grade_to_score(grade) -> float | None:
    if grade is None:
        return None
    return _GRADE_TO_SCORE.get(str(getattr(grade, "value", grade)).lower())


def _chunk_confidence(doc_conf, page_conf, page_no, is_table, items) -> float:
    base = page_conf.get(page_no, doc_conf) if page_no is not None else doc_conf
    if is_table:
        gridded = any(
            getattr(getattr(it, "data", None), "num_rows", 0)
            and getattr(getattr(it, "data", None), "num_cols", 0)
            for it in items
        )
        base *= 1.0 if gridded else 0.85
    return round(max(0.0, min(1.0, base)), 4)


def _merge_small(chunks: list[Chunk], min_chars: int, max_chars: int) -> list[Chunk]:
    merged: list[Chunk] = []
    for ck in chunks:
        prev = merged[-1] if merged else None
        if (
            prev
            and not ck.metadata.is_table
            and not prev.metadata.is_table
            and prev.metadata.headers == ck.metadata.headers
            and len(prev.text) < min_chars
            and len(prev.text) + len(ck.text) <= max_chars
        ):
            merged[-1] = Chunk(
                text=f"{prev.text}\n{ck.text}".strip(),
                metadata=prev.metadata,
                confidence=min(prev.confidence, ck.confidence),
            )
        else:
            merged.append(ck)
    return merged


def _make_stream(name: str, data: bytes):
    from docling.datamodel.base_models import DocumentStream

    return DocumentStream(name=name, stream=BytesIO(data))


def _pages_from_result(result) -> int:
    pages = getattr(result, "pages", None)
    return len(pages) if pages else 0


def _safe(fn, default):
    try:
        return fn()
    except Exception:  # noqa: BLE001
        return default


_default_parser = StructuralDocumentParser()


def parse_document(source: str | Path | bytes, *, filename: str | None = None) -> list[Chunk]:
    """Convenience wrapper around a shared parser instance."""
    return _default_parser.parse(source, filename=filename)
