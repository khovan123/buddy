"""
Retrieval pipeline — embeds a query and searches the vector store.

Wraps the embedder + vector_store into a single ``retrieve()`` call
with optional metadata filtering.
"""

import logging
from dataclasses import dataclass

from rag.embedder import embed_query
from rag.vector_store import VectorStore, SearchResult
from rag.config_rag import RAG_TOP_K

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    """A chunk retrieved for a user query, with source metadata."""

    text: str
    score: float
    item_id: str
    item_type: str
    major_id: str
    course_id: str
    title: str
    slug: str
    chunk_index: int


class Retriever:
    """Top-k semantic retrieval over the Qdrant vector store."""

    def __init__(self, vector_store: VectorStore):
        """
        Args:
            vector_store: VectorStore instance (Qdrant).
        """
        self._vector = vector_store

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        filters: dict | None = None,
    ) -> list[RetrievedChunk]:
        """Embed a query and return the top-k most relevant chunks.

        Args:
            query: The user's natural-language query.
            top_k: Number of chunks to return (defaults to RAG_TOP_K).
            filters: Optional dict with keys ``majorId``, ``courseId``,
                     ``itemType`` for metadata filtering.

        Returns:
            List of RetrievedChunk objects ordered by descending relevance.
        """
        k = top_k or RAG_TOP_K

        query_embedding = embed_query(query)
        results: list[SearchResult] = self._vector.search(
            query_embedding=query_embedding,
            top_k=k,
            filters=filters,
        )

        chunks = [
            RetrievedChunk(
                text=r.text,
                score=r.score,
                item_id=r.item_id,
                item_type=r.item_type,
                major_id=r.major_id,
                course_id=r.course_id,
                title=r.title,
                slug=r.slug,
                chunk_index=r.chunk_index,
            )
            for r in results
        ]

        logger.info(f"Retrieved {len(chunks)} chunks for query: {query[:80]}...")
        return chunks
