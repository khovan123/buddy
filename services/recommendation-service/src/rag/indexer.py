"""
Indexing orchestrator — manages the lifecycle of content in the vector store.

Reads items from the catalog_store (MongoDB materialized view), chunks them,
embeds them, and upserts them into Qdrant.  Supports both full re-index
and incremental single-item operations.

Only indexes items with status == AVAILABLE (no drafts or pending content).
"""

import logging

from rag.chunker import chunk_item, chunk_items, Chunk
from rag.vector_store import VectorStore

logger = logging.getLogger(__name__)

# Statuses that should be indexed
_INDEXABLE_STATUSES = {"AVAILABLE", "PUBLISHED"}


class RAGIndexer:
    """Orchestrates content indexing into the vector store."""

    def __init__(self, catalog_store, vector_store: VectorStore):
        """
        Args:
            catalog_store: CatalogStore instance (MongoDB materialized view).
            vector_store: VectorStore instance (Qdrant).
        """
        self._catalog = catalog_store
        self._vector = vector_store

    # ── Enrichment ────────────────────────────────────────────────────

    def _enrich_items(self, items: list[dict]) -> None:
        """Bulk-inject human-readable major/course names (for full re-index).

        Fetches ALL majors and courses in two queries, then resolves names
        for every item.  Efficient when ``len(items)`` is large, but
        wasteful for single-item upserts — use :meth:`_enrich_item` there.
        """
        majors = self._catalog.get_majors()    # {majorId: {name, code, …}}
        courses = self._catalog.get_courses()  # {courseId: {name, code, …}}
        for item in items:
            mid = item.get("majorId", "")
            cid = item.get("courseId", "")
            if mid and mid in majors:
                item["_major_name"] = majors[mid].get("name", "")
            if cid and cid in courses:
                item["_course_name"] = courses[cid].get("name", "")

    def _enrich_item(self, item: dict) -> None:
        """Per-ID enrichment for incremental indexing (O(1) lookups).

        Uses indexed point-queries (``get_major`` / ``get_course``) so cost
        is constant regardless of total catalog size.
        """
        mid = item.get("majorId", "")
        cid = item.get("courseId", "")
        if mid:
            major = self._catalog.get_major(mid)
            if major:
                item["_major_name"] = major.get("name", "")
        if cid:
            course = self._catalog.get_course(cid)
            if course:
                item["_course_name"] = course.get("name", "")

    # ── Full re-index ────────────────────────────────────────────────

    def index_all(self) -> dict:
        """Full re-index: read all catalog items, chunk, embed, upsert.

        Only indexes items with AVAILABLE/PUBLISHED status.

        Returns:
            Dict with ``items_read``, ``items_indexed``, and ``chunks_indexed``.
        """
        all_items = self._catalog.get_all_items()
        items = [
            item for item in all_items
            if item.get("status", "AVAILABLE") in _INDEXABLE_STATUSES
        ]

        logger.info(f"Full re-index: {len(items)} indexable items out of {len(all_items)} total")

        if not items:
            return {"items_read": len(all_items), "items_indexed": 0, "chunks_indexed": 0}

        self._enrich_items(items)
        chunks = chunk_items(items)

        if not chunks:
            return {"items_read": len(all_items), "items_indexed": len(items), "chunks_indexed": 0}

        from rag.embedder import embed_texts

        texts = [c.text for c in chunks]
        embeddings = embed_texts(texts)

        count = self._vector.upsert_chunks(chunks, embeddings)

        return {
            "items_read": len(all_items),
            "items_indexed": len(items),
            "chunks_indexed": count,
        }

    def index_item(self, item: dict) -> int:
        """Incrementally index a single item.

        Deletes existing chunks for the item first (idempotent upsert).
        Skips items that are not in an indexable status.

        Args:
            item: Catalog item dict.

        Returns:
            Number of chunks indexed (0 if skipped).
        """
        item_id = item.get("itemId", "")
        status = item.get("status", "AVAILABLE")

        if status not in _INDEXABLE_STATUSES:
            logger.debug(f"Skipping non-indexable item {item_id} (status={status})")
            self.remove_item(item_id)
            return 0

        # Remove old chunks first
        self._vector.delete_by_item_id(item_id)

        self._enrich_item(item)
        chunks = chunk_item(item)
        if not chunks:
            return 0

        from rag.embedder import embed_texts

        texts = [c.text for c in chunks]
        embeddings = embed_texts(texts)

        return self._vector.upsert_chunks(chunks, embeddings)

    def remove_item(self, item_id: str) -> None:
        """Remove all chunks for an item from the vector store.

        Args:
            item_id: The content item's unique identifier.
        """
        self._vector.delete_by_item_id(item_id)

    # ── Targeted reindex (major / course rename) ─────────────────────

    def reindex_by_major(self, major_id: str) -> int:
        """Re-embed all items linked to a major (e.g. after a rename).

        Fetches items from the catalog store by ``majorId``, enriches each
        with the (now-updated) major/course names, and re-indexes them.

        Args:
            major_id: The major whose linked items should be refreshed.

        Returns:
            Total number of chunks re-indexed across all affected items.
        """
        items = self._catalog.get_items_by_major(major_id)
        items = [i for i in items if i.get("status", "AVAILABLE") in _INDEXABLE_STATUSES]
        if not items:
            return 0

        logger.info(f"Reindexing {len(items)} items for major {major_id}")
        total = 0
        for item in items:
            total += self.index_item(item)
        return total

    def reindex_by_course(self, course_id: str) -> int:
        """Re-embed all items linked to a course (e.g. after a rename).

        Fetches items from the catalog store by ``courseId``, enriches each
        with the (now-updated) major/course names, and re-indexes them.

        Args:
            course_id: The course whose linked items should be refreshed.

        Returns:
            Total number of chunks re-indexed across all affected items.
        """
        items = self._catalog.get_items_by_course(course_id)
        items = [i for i in items if i.get("status", "AVAILABLE") in _INDEXABLE_STATUSES]
        if not items:
            return 0

        logger.info(f"Reindexing {len(items)} items for course {course_id}")
        total = 0
        for item in items:
            total += self.index_item(item)
        return total
