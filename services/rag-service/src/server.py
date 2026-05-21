"""
FastAPI server for the dedicated RAG service.

This process runs the RAG/Qdrant/Gemini pipeline **and** a RabbitMQ consumer
that keeps the Qdrant index in sync with content-service events (ITEM_UPSERT,
ITEM_DELETED, etc.) via the ``content.sync`` fanout exchange.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import redis
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from config import ALLOWED_ORIGINS, HOST, PORT, REDIS_URL
from consumer import RAGContentConsumer
from rag.indexer import RAGIndexer
from rag.pipeline import RAGPipeline
from rag.retriever import Retriever
from rag.vector_store import VectorStore
from stores.catalog_store import CatalogStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HEALTH_CHECK_TIMEOUT_SECONDS = 5
RAG_STATS_TIMEOUT_SECONDS = 8
RAG_ASK_TIMEOUT_SECONDS = 90
RAG_STARTUP_WARMUP_ENABLED = (
    os.getenv("RAG_STARTUP_WARMUP_ENABLED", "true").lower() == "true"
)
RAG_WORKER_LIMIT = int(os.getenv("RAG_BLOCKING_WORKERS", "4"))

rag_blocking_executor = ThreadPoolExecutor(
    max_workers=RAG_WORKER_LIMIT,
    thread_name_prefix="rag-blocking",
)
rag_blocking_slots = threading.BoundedSemaphore(RAG_WORKER_LIMIT)

catalog_store = CatalogStore()
redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=10, socket_timeout=10)

rag_pipeline = None
rag_indexer = None
rag_vector_store = None
rag_lock = threading.Lock()

_rag_consumer: RAGContentConsumer | None = None


class RAGRequest(BaseModel):
    query: str
    userId: str | None = None
    majorId: str | None = None
    courseId: str | None = None
    topK: int = Field(default=5, ge=1, le=20)


class RAGSource(BaseModel):
    slug: str
    itemType: str
    title: str
    score: float
    chunkText: str


class RAGResponse(BaseModel):
    answer: str
    sources: list[RAGSource]
    model: str
    tokensUsed: int
    retrievalTimeMs: float
    generationTimeMs: float


def _rag_module_ready() -> bool:
    return bool(rag_pipeline and rag_indexer and rag_vector_store)


def _rag_embedding_ready() -> bool:
    try:
        from rag.embedder import is_model_loaded

        return is_model_loaded()
    except Exception as e:
        logger.warning("Embedding readiness check failed: %s", e)
        return False


def _embedding_not_ready_response() -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "message": "RAG embedding model not ready",
            "status": "degraded",
            "reason": "embedding_model_not_loaded",
        },
    )


async def _run_blocking_with_timeout(name: str, func, *args, timeout: int, **kwargs):
    if not rag_blocking_slots.acquire(blocking=False):
        logger.warning("%s rejected because RAG worker pool is full", name)
        return JSONResponse(
            status_code=503,
            content={"message": f"{name} busy", "status": "unavailable"},
        )

    def _run():
        try:
            return func(*args, **kwargs)
        finally:
            rag_blocking_slots.release()

    loop = asyncio.get_running_loop()
    future = loop.run_in_executor(rag_blocking_executor, _run)
    try:
        return await asyncio.wait_for(asyncio.shield(future), timeout=timeout)
    except asyncio.TimeoutError:
        future.add_done_callback(lambda done: _consume_late_blocking_result(name, done))
        logger.warning("%s timed out after %ss", name, timeout)
        return JSONResponse(
            status_code=503,
            content={"message": f"{name} timed out", "status": "unavailable"},
        )


def _consume_late_blocking_result(name: str, future) -> None:
    try:
        future.result()
    except Exception as e:
        logger.warning("%s failed after request timed out: %s", name, e)


def get_rag_module():
    global rag_pipeline, rag_indexer, rag_vector_store

    if rag_pipeline and rag_indexer and rag_vector_store:
        return rag_pipeline, rag_indexer, rag_vector_store

    with rag_lock:
        if rag_pipeline and rag_indexer and rag_vector_store:
            return rag_pipeline, rag_indexer, rag_vector_store

        vector_store = VectorStore()
        indexer = RAGIndexer(catalog_store, vector_store)
        retriever = Retriever(vector_store)
        pipeline = RAGPipeline(retriever, redis_client)

        rag_vector_store = vector_store
        rag_indexer = indexer
        rag_pipeline = pipeline
        logger.info("RAG module initialised")
        return rag_pipeline, rag_indexer, rag_vector_store


def _auto_index(indexer) -> None:
    try:
        result = indexer.index_all()
        logger.info("Auto-index completed: %s", result)
    except Exception as e:
        logger.error("Auto-index failed: %s", e)


def _warm_rag_background() -> None:
    try:
        from rag.embedder import preload_model

        logger.info("Pre-warming embedding model...")
        if preload_model():
            logger.info("Embedding model ready")
        else:
            logger.warning("Embedding model preload failed")
    except Exception as e:
        logger.warning("Embedding preload error: %s", e)

    _bootstrap_rag_index_background()


def _bootstrap_rag_index_background() -> None:
    try:
        _, indexer, vector_store = get_rag_module()
        info = vector_store.get_collection_info()
        if info.get("vectors_count", 0) == 0:
            logger.info("Vector store empty; triggering auto-index")
            threading.Thread(target=_auto_index, args=(indexer,), daemon=True).start()
        else:
            logger.info("Vector store has %s vectors; skipping auto-index", info.get("vectors_count"))
    except Exception as e:
        logger.warning("Auto-index check failed: %s", e)


def _start_content_consumer() -> None:
    """Start the RAG content-sync consumer after the RAG module is ready.

    Retries ``get_rag_module()`` with exponential backoff so transient
    dependency outages (Qdrant, MongoDB) during startup don't permanently
    kill the consumer thread.
    """
    global _rag_consumer
    retry_delay = 5

    while True:
        try:
            _, indexer, _ = get_rag_module()
            consumer = RAGContentConsumer(catalog_store, indexer)
            _rag_consumer = consumer
            # start_consuming() has its own internal reconnect loop for
            # RabbitMQ failures; if it ever returns, we re-enter this
            # outer loop to re-init the module and restart.
            consumer.start_consuming()
        except Exception as e:
            logger.error(
                "Content-sync consumer init failed: %s. Retrying in %ds...",
                e, retry_delay, exc_info=True,
            )
            import time
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if RAG_STARTUP_WARMUP_ENABLED:
        threading.Thread(target=_warm_rag_background, daemon=True).start()
    else:
        threading.Thread(target=_bootstrap_rag_index_background, daemon=True).start()

    # Start content-sync consumer in a daemon thread
    threading.Thread(target=_start_content_consumer, daemon=True, name="rag-consumer").start()

    logger.info("RAG service started")
    yield

    # Graceful shutdown
    if _rag_consumer:
        _rag_consumer.close()
    catalog_store.close()
    logger.info("RAG service shutdown")


app = FastAPI(title="Unibuddy RAG Service", version="1.0.0", lifespan=lifespan)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        response = await call_next(request)
        response.headers["x-correlation-id"] = correlation_id
        return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization", "x-correlation-id"],
    expose_headers=["x-correlation-id"],
)
app.add_middleware(CorrelationIdMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error("[%s] Unhandled exception: %s", correlation_id, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "correlationId": correlation_id},
    )


health_router = APIRouter(prefix="/v1/health", tags=["health"])


@health_router.get("")
async def health():
    return {
        "status": "healthy",
        "service": "rag-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@health_router.get("/liveness")
async def liveness():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@health_router.get("/readiness")
async def readiness():
    result = await _run_blocking_with_timeout(
        "readiness check",
        catalog_store._db.command,
        "ping",
        timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
    )
    if isinstance(result, JSONResponse):
        return result
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


app.include_router(health_router)

rag_router = APIRouter(prefix="/v1/rag", tags=["rag"])


@rag_router.post("/ask", response_model=RAGResponse)
async def rag_ask(body: RAGRequest):
    if not _rag_embedding_ready():
        return _embedding_not_ready_response()

    module = await _run_blocking_with_timeout(
        "RAG module init",
        get_rag_module,
        timeout=RAG_STATS_TIMEOUT_SECONDS,
    )
    if isinstance(module, JSONResponse):
        return module
    pipeline, _, _ = module

    filters = _filters_from_request(body)
    result = await _run_blocking_with_timeout(
        "RAG query",
        pipeline.ask,
        query=body.query,
        user_id=body.userId,
        filters=filters or None,
        top_k=body.topK,
        timeout=RAG_ASK_TIMEOUT_SECONDS,
    )
    return result


@rag_router.post("/retrieve")
async def rag_retrieve(body: RAGRequest):
    if not _rag_embedding_ready():
        return _embedding_not_ready_response()

    module = await _run_blocking_with_timeout(
        "RAG module init",
        get_rag_module,
        timeout=RAG_STATS_TIMEOUT_SECONDS,
    )
    if isinstance(module, JSONResponse):
        return module
    pipeline, _, _ = module

    filters = _filters_from_request(body)
    result = await _run_blocking_with_timeout(
        "RAG retrieve",
        pipeline.retrieve_only,
        query=body.query,
        filters=filters or None,
        top_k=body.topK,
        timeout=RAG_ASK_TIMEOUT_SECONDS,
    )
    return result


@rag_router.post("/index")
async def rag_index():
    module = await _run_blocking_with_timeout(
        "RAG module init",
        get_rag_module,
        timeout=RAG_STATS_TIMEOUT_SECONDS,
    )
    if isinstance(module, JSONResponse):
        return module
    _, indexer, _ = module

    threading.Thread(target=_auto_index, args=(indexer,), daemon=True).start()
    return {"status": "indexing_started"}


@rag_router.get("/health")
async def rag_health():
    rag_ready = _rag_module_ready()
    embedding_ready = _rag_embedding_ready()
    return {
        "status": "ok" if rag_ready and embedding_ready else "degraded",
        "rag_module": "ready" if rag_ready else "not_initialized",
        "embedding_model": "loaded" if embedding_ready else "not_loaded",
    }


@rag_router.get("/stats")
async def rag_stats():
    def _get_stats() -> dict:
        _, _, vector_store = get_rag_module()
        return vector_store.get_collection_info()

    info = await _run_blocking_with_timeout(
        "RAG stats lookup",
        _get_stats,
        timeout=RAG_STATS_TIMEOUT_SECONDS,
    )
    if isinstance(info, JSONResponse):
        return info
    return {"status": "ok", "collection": info}


def _filters_from_request(body: RAGRequest) -> dict:
    filters = {}
    if body.majorId:
        filters["majorId"] = body.majorId
    if body.courseId:
        filters["courseId"] = body.courseId
    return filters


app.include_router(rag_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT, access_log=False)
