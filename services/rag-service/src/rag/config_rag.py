"""
RAG-specific configuration.

All settings are loaded from environment variables with sensible defaults
for local development.
"""

import os

# ─── Vector Database (Qdrant Cloud) ─────────────────────────────────────────
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "unibuddy_content")

# ─── Embedding Model ────────────────────────────────────────────────────────
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "384"))

# ─── Chunking ───────────────────────────────────────────────────────────────
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "512"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "64"))

# ─── Retrieval ──────────────────────────────────────────────────────────────
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

# ─── LLM (Gemini) ──────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "45"))

# ─── Cache ──────────────────────────────────────────────────────────────────
RAG_CACHE_TTL = int(os.getenv("RAG_CACHE_TTL", "300"))
