"""
Qdrant vector store interface.

Wraps the Qdrant client for upsert, search, and delete operations.
Supports metadata filtering by majorId, courseId, and itemType.
"""

import logging
import uuid
from dataclasses import dataclass

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from rag.chunker import Chunk
from rag.config_rag import (
    QDRANT_HOST,
    QDRANT_PORT,
    QDRANT_COLLECTION,
    EMBEDDING_DIM,
    QDRANT_URL,
    QDRANT_API_KEY,
)

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """A single search result from the vector store."""

    text: str
    score: float
    item_id: str
    item_type: str
    major_id: str
    course_id: str
    title: str
    slug: str
    chunk_index: int


class VectorStore:
    """Qdrant vector store for RAG chunk storage and retrieval."""

    def __init__(self):
        """Connect to Qdrant and ensure the collection exists."""
        if QDRANT_URL:
            self._client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)
        else:
            self._client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=60)
        self._collection = QDRANT_COLLECTION
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        """Create the collection if it does not exist."""
        collections = [c.name for c in self._client.get_collections().collections]
        if self._collection not in collections:
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=VectorParams(
                    size=EMBEDDING_DIM,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created Qdrant collection: {self._collection}")
        else:
            logger.info(f"Qdrant collection exists: {self._collection}")

    def upsert_chunks(self, chunks: list[Chunk], embeddings: np.ndarray) -> int:
        """Batch upsert chunks with their embeddings.

        Args:
            chunks: List of Chunk objects.
            embeddings: Numpy array of shape ``(len(chunks), EMBEDDING_DIM)``.

        Returns:
            Number of points upserted.
        """
        if not chunks:
            return 0

        points = []
        for chunk, embedding in zip(chunks, embeddings):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{chunk.item_id}:{chunk.chunk_index}"))
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding.tolist(),
                    payload={
                        "text": chunk.text,
                        "item_id": chunk.item_id,
                        "item_type": chunk.item_type,
                        "major_id": chunk.major_id,
                        "course_id": chunk.course_id,
                        "title": chunk.title,
                        "slug": chunk.slug,
                        "chunk_index": chunk.chunk_index,
                    },
                )
            )

        # Batch upsert in groups of 100
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            self._client.upsert(collection_name=self._collection, points=batch)

        logger.info(f"Upserted {len(points)} chunks to Qdrant")
        return len(points)

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        filters: dict | None = None,
    ) -> list[SearchResult]:
        """Semantic search over the vector store.

        Args:
            query_embedding: Query vector of shape ``(EMBEDDING_DIM,)``.
            top_k: Number of results to return.
            filters: Optional dict with keys ``majorId``, ``courseId``,
                     ``itemType`` for metadata filtering.

        Returns:
            List of SearchResult objects ordered by descending relevance.
        """
        qdrant_filter = self._build_filter(filters) if filters else None

        results = self._client.query_points(
            collection_name=self._collection,
            query=query_embedding.tolist(),
            limit=top_k,
            query_filter=qdrant_filter,
            with_payload=True,
        )

        return [
            SearchResult(
                text=hit.payload.get("text", ""),
                score=hit.score,
                item_id=hit.payload.get("item_id", ""),
                item_type=hit.payload.get("item_type", ""),
                major_id=hit.payload.get("major_id", ""),
                course_id=hit.payload.get("course_id", ""),
                title=hit.payload.get("title", ""),
                slug=hit.payload.get("slug", ""),
                chunk_index=hit.payload.get("chunk_index", 0),
            )
            for hit in results.points
        ]

    def delete_by_item_id(self, item_id: str) -> None:
        """Remove all chunks for a given item.

        Args:
            item_id: The content item's unique identifier.
        """
        self._client.delete(
            collection_name=self._collection,
            points_selector=Filter(
                must=[FieldCondition(key="item_id", match=MatchValue(value=item_id))]
            ),
        )
        logger.info(f"Deleted chunks for item: {item_id}")

    def get_collection_info(self) -> dict:
        """Return collection statistics.

        Returns:
            Dictionary with ``name``, ``vectors_count``, ``points_count``,
            and ``status``.
        """
        info = self._client.get_collection(self._collection)
        return {
            "name": self._collection,
            "vectors_count": getattr(info, 'vectors_count', info.points_count),
            "points_count": info.points_count,
            "status": str(info.status),
        }

    def _build_filter(self, filters: dict) -> Filter:
        """Build a Qdrant filter from a dict of field conditions.

        Args:
            filters: Dict with optional keys ``majorId``, ``courseId``,
                     ``itemType``.

        Returns:
            Qdrant Filter object.
        """
        conditions = []

        field_map = {
            "majorId": "major_id",
            "courseId": "course_id",
            "itemType": "item_type",
        }

        for param_key, payload_key in field_map.items():
            value = filters.get(param_key)
            if value:
                conditions.append(
                    FieldCondition(key=payload_key, match=MatchValue(value=value))
                )

        return Filter(must=conditions) if conditions else None
