# ─── Stage 1: Build dependencies ────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY services/rag-service/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─── Stage 2: Production image ──────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /install /usr/local

# Runtime cache only. Do NOT download Hugging Face model during Docker build.
# Docker build can fail with HF 429 rate limit in CI/CD.
ENV HF_HOME=/app/.model_cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/.model_cache
ENV TRANSFORMERS_CACHE=/app/.model_cache

COPY services/rag-service/src/ .

ENV PYTHONUNBUFFERED=1
ENV SERVICE_NAME=rag-service
ENV HOST=0.0.0.0
ENV PORT=8080
ENV TOKENIZERS_PARALLELISM=false
ENV TF_ENABLE_ONEDNN_OPTS=0

# Avoid Cloud Run startup failure because HF model download/warmup is slow or rate-limited.
# First RAG request can lazy-load the model, or you can enable this later after using a cached model/artifact.
ENV RAG_STARTUP_WARMUP_ENABLED=false
ENV RAG_BOOTSTRAP_INDEX_ENABLED=false

EXPOSE 8080

CMD ["python", "server.py"]
