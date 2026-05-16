"""
Embedding pipeline — sentence-transformers wrapper.

Loads the model lazily as a singleton to avoid repeated heavy init.
Runs on CPU only (consistent with the existing TF-based recommendation model).
"""

import logging
import numpy as np
from sentence_transformers import SentenceTransformer

from rag.config_rag import EMBEDDING_MODEL, EMBEDDING_DIM

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Return the singleton SentenceTransformer instance, loading on first call."""
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info(f"Embedding model loaded (dim={EMBEDDING_DIM})")
    return _model


def embed_texts(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """Batch-embed a list of texts.

    Args:
        texts: List of text strings to embed.
        batch_size: Encoding batch size.

    Returns:
        Numpy array of shape ``(len(texts), EMBEDDING_DIM)``.
    """
    model = _get_model()
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
    model = _get_model()
    embedding = model.encode(query, normalize_embeddings=True)
    return np.array(embedding, dtype=np.float32)
