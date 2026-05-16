"""
Indexing orchestrator — manages the lifecycle of content in the vector store.

Reads items from the catalog_store (MongoDB materialized view), chunks them,
embeds them, and upserts them into Qdrant.  Supports both full re-index
and incremental single-item operations.

Only indexes items with status == AVAILABLE (no drafts or pending content).
"""

import logging

from rag.chunker import chunk_item, chunk_items, Chunk
from rag.embedder import embed_texts
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

        chunks = chunk_items(items)

        if not chunks:
            return {"items_read": len(all_items), "items_indexed": len(items), "chunks_indexed": 0}

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

        chunks = chunk_item(item)
        if not chunks:
            return 0

        texts = [c.text for c in chunks]
        embeddings = embed_texts(texts)

        return self._vector.upsert_chunks(chunks, embeddings)

    def remove_item(self, item_id: str) -> None:
        """Remove all chunks for an item from the vector store.

        Args:
            item_id: The content item's unique identifier.
        """
        self._vector.delete_by_item_id(item_id)
