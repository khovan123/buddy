"""
Text chunker — splits content items into indexable chunks.

Handles Resources (title + summary + highlights) and Tutorials
(title + description + highlights + steps) with metadata preservation.
Only indexes content with AVAILABLE status.
"""

import logging
from dataclasses import dataclass, field

from rag.config_rag import CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """A single text chunk with source metadata."""

    text: str
    item_id: str
    item_type: str
    major_id: str
    course_id: str
    title: str
    slug: str
    chunk_index: int


def _build_document_text(item: dict) -> str:
    """Assemble a single document string from an item's text fields.

    Prioritises body content (summary, highlights, steps) over metadata
    so that the embedding model encodes actual educational material.

    Uses ``_major_name`` / ``_course_name`` keys (injected by the indexer's
    enrichment pass) instead of raw UUIDs to provide human-readable context
    without wasting embedding dimensions on meaningless identifiers.

    Args:
        item: Catalog item dict from MongoDB (possibly enriched).

    Returns:
        Combined text suitable for chunking.
    """
    parts: list[str] = []

    title = item.get("title", "")
    if title:
        parts.append(f"Title: {title}")

    # Resources use 'summary', tutorials use 'description'
    summary = item.get("summary") or item.get("description") or ""
    if summary:
        parts.append(f"Summary: {summary}")

    highlights = item.get("hightlights") or item.get("highlights") or []
    if highlights:
        parts.append("Key points: " + "; ".join(highlights))

    steps = item.get("steps") or []
    if steps:
        step_texts = []
        for i, step in enumerate(steps, 1):
            step_title = step.get("title", "")
            step_desc = step.get("description", "")
            if step_title and step_desc:
                step_texts.append(f"Step {i}: {step_title} - {step_desc}")
            elif step_title:
                step_texts.append(f"Step {i}: {step_title}")
        if step_texts:
            parts.append("Steps: " + "; ".join(step_texts))

    major_name = item.get("_major_name", "")
    course_name = item.get("_course_name", "")
    if major_name:
        parts.append(f"Major: {major_name}")
    if course_name:
        parts.append(f"Course: {course_name}")

    return "\n".join(parts)


def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks at sentence boundaries.

    Tries to break at sentence-ending punctuation (. ! ?) for cleaner
    chunks.  Falls back to hard character split when no boundary is found.

    Args:
        text: The full document text.
        chunk_size: Maximum characters per chunk.
        overlap: Characters of overlap between consecutive chunks.

    Returns:
        List of text chunks.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        # If not at end, try to break at a sentence boundary
        if end < len(text):
            # Look backwards for a sentence boundary
            search_region = text[start:end]
            for sep in [". ", "! ", "? ", ".\n", "\n\n", "\n"]:
                last_sep = search_region.rfind(sep)
                if last_sep > chunk_size // 2:
                    end = start + last_sep + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap
        if start >= len(text):
            break

    return chunks


def chunk_item(item: dict) -> list[Chunk]:
    """Chunk a single catalog item into indexable pieces.

    Args:
        item: Catalog item dict with at least ``itemId``, ``itemType``,
              ``title``, and text fields.

    Returns:
        List of Chunk objects.  Returns empty list if the item has no
        meaningful text content.
    """
    text = _build_document_text(item)
    if not text.strip():
        return []

    item_id = item.get("itemId", "")
    item_type = item.get("itemType", "")
    major_id = item.get("majorId", "")
    course_id = item.get("courseId", "")
    title = item.get("title", "")
    slug = item.get("slug", "")

    raw_chunks = _split_text(text, CHUNK_SIZE, CHUNK_OVERLAP)

    return [
        Chunk(
            text=chunk_text,
            item_id=item_id,
            item_type=item_type,
            major_id=major_id,
            course_id=course_id,
            title=title,
            slug=slug,
            chunk_index=i,
        )
        for i, chunk_text in enumerate(raw_chunks)
    ]


def chunk_items(items: list[dict]) -> list[Chunk]:
    """Chunk a list of catalog items.

    Args:
        items: List of catalog item dicts.

    Returns:
        Flat list of all Chunk objects across all items.
    """
    all_chunks: list[Chunk] = []
    for item in items:
        all_chunks.extend(chunk_item(item))

    logger.info(f"Chunked {len(items)} items into {len(all_chunks)} chunks")
    return all_chunks
