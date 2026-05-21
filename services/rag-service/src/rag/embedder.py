"""
Embedding pipeline — sentence-transformers wrapper.

Loads the model eagerly via ``preload_model()`` or lazily on first call.
Uses a double-checked lock to prevent race conditions when multiple
threads initialise the model simultaneously during cold start.

Runs on CPU only (consistent with the existing TF-based recommendation model).
"""

from __future__ import annotations

import logging
import os
import threading
from typing import TYPE_CHECKING

import numpy as np

from rag.config_rag import EMBEDDING_MODEL, EMBEDDING_DIM

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingModelNotReady(RuntimeError):
    """Raised when request-time RAG tries to use an unloaded embedding model."""


_model: SentenceTransformer | None = None
_model_lock = threading.Lock()

# Use the same cache folder set during Docker build so the pre-downloaded
# weights are found without an internet round-trip.
# In Docker, TRANSFORMERS_CACHE=/app/.model_cache (set in Dockerfile).
# Locally, fall back to None → sentence-transformers uses ~/.cache/huggingface.
_CACHE_FOLDER = os.getenv("TRANSFORMERS_CACHE") or None


def _load_model() -> SentenceTransformer:
    """Load and return the singleton SentenceTransformer instance.

    Uses double-checked locking to ensure thread-safety without holding
    the lock on every call after initialisation.
    """
    global _model
    if _model is not None:
        return _model

    with _model_lock:
        # Re-check after acquiring lock (another thread may have loaded it)
        if _model is not None:
            return _model

        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading embedding model: {EMBEDDING_MODEL} (cache={_CACHE_FOLDER})")
        _model = SentenceTransformer(EMBEDDING_MODEL, cache_folder=_CACHE_FOLDER)
        logger.info(f"Embedding model loaded (dim={EMBEDDING_DIM})")
        return _model


def _get_loaded_model() -> SentenceTransformer:
    """Return the loaded model without triggering a cold load."""
    if _model is None:
        raise EmbeddingModelNotReady("RAG embedding model is not loaded")
    return _model


def preload_model() -> bool:
    """Eagerly load the embedding model.

    Intended to be called during startup so the first user request
    does not pay the cold-start cost.

    Returns:
        ``True`` if the model loaded successfully, ``False`` on failure.
    """
    try:
        _load_model()
        # Quick sanity encode to validate the model works
        _load_model().encode(["warmup"], normalize_embeddings=True)
        logger.info("Embedding model pre-warmed successfully")
        return True
    except Exception as e:
        logger.error(f"Embedding model preload failed: {e}")
        return False


def embedding_health() -> bool:
    """Check whether the embedding model is loaded and functional.

    Returns:
        ``True`` if a test encode succeeds, ``False`` otherwise.
    """
    try:
        model = _get_loaded_model()
        model.encode(["health check"], normalize_embeddings=True)
        return True
    except Exception as e:
        logger.warning(f"Embedding health check failed: {e}")
        return False


def is_model_loaded() -> bool:
    """Return whether the embedding model is already loaded without loading it."""
    return _model is not None


def embed_texts(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """Batch-embed a list of texts.

    Args:
        texts: List of text strings to embed.
        batch_size: Encoding batch size.

    Returns:
        Numpy array of shape ``(len(texts), EMBEDDING_DIM)``.
    """
    model = _load_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 100,
        normalize_embeddings=True,
    )
    return np.array(embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Embed a single query string.

    Args:
        query: The user's search query.

    Returns:
        Numpy array of shape ``(EMBEDDING_DIM,)``.
    """
    model = _get_loaded_model()
    embedding = model.encode(query, normalize_embeddings=True)
    return np.array(embedding, dtype=np.float32)
