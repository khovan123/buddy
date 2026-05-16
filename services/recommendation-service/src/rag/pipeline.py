"""
End-to-end RAG pipeline — orchestrates retrieve → generate → cache.

This is the main entry point for the RAG system.  It wires together
the retriever and generator, adds Redis caching, and returns a
structured response with sources and timing metrics.
"""

import json
import logging
import time
from dataclasses import dataclass

import redis

from rag.config_rag import RAG_CACHE_TTL, RAG_TOP_K
from rag.retriever import Retriever, RetrievedChunk
from rag.generator import generate, RAGGenerationResult

logger = logging.getLogger(__name__)


@dataclass
class RAGSource:
    """A single source cited in the RAG response."""

    slug: str
    item_type: str
    title: str
    score: float
    chunk_text: str


@dataclass
class RAGResult:
    """Full RAG pipeline result."""

    answer: str
    sources: list[RAGSource]
    model: str
    tokens_used: int
    retrieval_time_ms: float
    generation_time_ms: float


class RAGPipeline:
    """End-to-end RAG pipeline with caching."""

    def __init__(self, retriever: Retriever, redis_client: redis.Redis | None = None):
        """
        Args:
            retriever: Retriever instance for top-k search.
            redis_client: Optional Redis client for response caching.
        """
        self._retriever = retriever
        self._redis = redis_client

    def ask(
        self,
        query: str,
        user_id: str | None = None,
        filters: dict | None = None,
        top_k: int | None = None,
    ) -> dict:
        """Execute the full RAG pipeline.

        Steps:
            1. Fetch user chat history if user_id is provided
            2. Check Redis cache for identical query (skipped if user_id is present to maintain chat context)
            3. Retrieve top-k chunks from Qdrant
            4. Generate answer with Gemini using retrieved context and chat history
            5. Save updated chat history / Cache result in Redis
            6. Return structured response

        Args:
            query: The user's natural-language question.
            user_id: Optional user ID for logging/analytics and chat history.
            filters: Optional metadata filters (majorId, courseId, itemType).
            top_k: Override for number of chunks to retrieve.

        Returns:
            Dict with ``answer``, ``sources``, ``model``, ``tokensUsed``,
            ``retrievalTimeMs``, ``generationTimeMs``.
        """
        k = top_k or RAG_TOP_K

        # ── Chat History ─────────────────────────────────────────────────
        history = self._get_chat_history(user_id) if user_id else None

        # ── Cache check ─────────────────────────────────────────────────
        cache_key = self._cache_key(query, filters, k)
        
        # Bypass cache if user_id is present to ensure chat history is updated properly
        if not user_id:
            cached = self._get_cached(cache_key)
            if cached:
                logger.info(f"RAG cache hit for: {query[:60]}...")
                return cached

        # ── Retrieve ─────────────────────────────────────────────────────
        t0 = time.time()
        chunks = self._retriever.retrieve(query, top_k=k, filters=filters)
        retrieval_ms = (time.time() - t0) * 1000

        if not chunks:
            return self._empty_response(retrieval_ms)

        # ── Deduplicate by item_id (keep highest-scoring chunk per item) ─
        seen_items: dict[str, RetrievedChunk] = {}
        for chunk in chunks:
            if chunk.item_id not in seen_items or chunk.score > seen_items[chunk.item_id].score:
                seen_items[chunk.item_id] = chunk
        # But pass all chunks to LLM for richer context
        unique_chunks_for_sources = list(seen_items.values())

        # ── Generate ─────────────────────────────────────────────────────
        t1 = time.time()
        gen_result: RAGGenerationResult = generate(query, chunks, history=history)
        generation_ms = (time.time() - t1) * 1000

        # ── Build response ───────────────────────────────────────────────
        sources = [
            {
                "slug": c.slug,
                "itemType": c.item_type,
                "title": c.title,
                "score": round(c.score, 4),
                "chunkText": c.text[:200],  # Truncate for response size
            }
            for c in unique_chunks_for_sources
        ]

        result = {
            "answer": gen_result.answer,
            "sources": sources,
            "model": gen_result.model,
            "tokensUsed": gen_result.tokens_used,
            "retrievalTimeMs": round(retrieval_ms, 2),
            "generationTimeMs": round(generation_ms, 2),
        }

        # ── Cache & History ──────────────────────────────────────────────
        if user_id:
            self._save_chat_history(user_id, query, gen_result.answer)
        else:
            self._set_cached(cache_key, result)

        logger.info(
            f"RAG pipeline completed: retrieval={retrieval_ms:.0f}ms, "
            f"generation={generation_ms:.0f}ms, sources={len(sources)}"
        )
        return result

    def _empty_response(self, retrieval_ms: float) -> dict:
        """Return a response when no relevant chunks are found."""
        return {
            "answer": "I couldn't find any relevant content in the Unibuddy library for your question. Try rephrasing or being more specific about the topic, major, or course.",
            "sources": [],
            "model": "",
            "tokensUsed": 0,
            "retrievalTimeMs": round(retrieval_ms, 2),
            "generationTimeMs": 0,
        }

    def _cache_key(self, query: str, filters: dict | None, top_k: int) -> str:
        """Build a deterministic cache key."""
        filter_str = json.dumps(filters, sort_keys=True) if filters else ""
        return f"rag:{query.lower().strip()}:{filter_str}:{top_k}"

    def _get_cached(self, key: str) -> dict | None:
        """Try to get a cached response from Redis."""
        if not self._redis:
            return None
        try:
            data = self._redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"Redis cache get failed: {e}")
            return None

    def _set_cached(self, key: str, result: dict) -> None:
        """Cache a response in Redis."""
        if not self._redis:
            return
        try:
            self._redis.setex(key, RAG_CACHE_TTL, json.dumps(result))
        except Exception as e:
            logger.warning(f"Redis cache set failed: {e}")

    def _get_chat_history(self, user_id: str) -> list[dict] | None:
        """Fetch recent chat history for a user from Redis."""
        if not self._redis or not user_id:
            return None
        key = f"rag:history:{user_id}"
        try:
            data = self._redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"Failed to get chat history: {e}")
            return None

    def _save_chat_history(self, user_id: str, query: str, answer: str) -> None:
        """Save a new chat turn to Redis and trim to the last 5 turns."""
        if not self._redis or not user_id:
            return
        key = f"rag:history:{user_id}"
        try:
            history = self._get_chat_history(user_id) or []
            history.append({"query": query, "answer": answer})
            # Keep only the last 5 turns to limit context window and prevent drift
            history = history[-5:]
            # Set TTL to 1 hour (3600 seconds)
            self._redis.setex(key, 3600, json.dumps(history))
        except Exception as e:
            logger.warning(f"Failed to save chat history: {e}")
