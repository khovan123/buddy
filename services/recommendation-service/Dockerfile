# ─── Stage 1: Build dependencies ────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for building native extensions (faiss-cpu, numpy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY services/recommendation-service/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─── Stage 2: Production image ──────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Pre-download the embedding model so containers don't need internet at startup.
# Place BEFORE source COPY so Docker layer cache survives source-code changes.
ENV TRANSFORMERS_CACHE=/app/.model_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy application source
COPY services/recommendation-service/src/ .

# Copy pre-trained model artifacts (baseline version)
# In production, mount Azure Files volume over /app/artifacts for hot-swap
COPY services/recommendation-service/artifacts/ ./artifacts/

ENV PYTHONUNBUFFERED=1
ENV ARTIFACTS_DIR=/app/artifacts

EXPOSE 3009

CMD ["python", "server.py"]
