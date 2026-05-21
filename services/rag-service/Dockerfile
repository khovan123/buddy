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

# Pre-download the embedding model so startup does not depend on the internet.
ENV HF_HOME=/app/.model_cache
ENV TRANSFORMERS_CACHE=/app/.model_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder='/app/.model_cache')"

COPY services/rag-service/src/ .

ENV PYTHONUNBUFFERED=1
ENV SERVICE_NAME=rag-service
ENV RAG_STARTUP_WARMUP_ENABLED=true
ENV TOKENIZERS_PARALLELISM=false
ENV TF_ENABLE_ONEDNN_OPTS=0

EXPOSE 3009

CMD ["python", "server.py"]
