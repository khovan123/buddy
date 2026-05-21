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

# Copy application source
COPY services/recommendation-service/src/ .

# Copy pre-trained model artifacts (baseline version)
# In production, mount Azure Files volume over /app/artifacts for hot-swap
COPY services/recommendation-service/artifacts/ ./artifacts/

ENV PYTHONUNBUFFERED=1
ENV ARTIFACTS_DIR=/app/artifacts
ENV TF_ENABLE_ONEDNN_OPTS=0

EXPOSE 3009

CMD ["python", "server.py"]
