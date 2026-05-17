"""
FastAPI server — recommendation API + health endpoints.

This module defines the main FastAPI application for the recommendation service.
It exposes versioned REST endpoints under ``/v1/health`` and ``/v1/recommendation``
and wires up the RabbitMQ consumer, model scheduler, and CORS middleware on startup.
"""

import logging
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import redis
import json
import uuid
from fastapi import APIRouter, FastAPI, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from config import HOST, PORT, RECOMMENDATION_CACHE_TTL, REDIS_URL, ALLOWED_ORIGINS
from models import RecommendResponse, TrendingResponse, HealthResponse, RAGRequest, RAGResponse
from stores.catalog_store import CatalogStore
from stores.user_profile_store import UserProfileStore
from stores.item_popularity_store import ItemPopularityStore
from scoring.engine import ScoringEngine
from consumer import EventConsumer
from scheduler import ModelScheduler
from ml.drift_monitor import DriftMonitor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Global singletons (all read from recommendation_db only) ──────────────────

user_store = UserProfileStore()
popularity_store = ItemPopularityStore()
catalog_store = CatalogStore()
scoring_engine = ScoringEngine(user_store, popularity_store, catalog_store)
redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=10, socket_timeout=10)

# RAG singletons (lazy-initialised in lifespan to defer heavy model load)
rag_pipeline = None
rag_indexer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle — startup and shutdown hooks.

    CRITICAL: Yields immediately so Uvicorn binds port 3009 ASAP.
    All heavy initialization runs in background threads AFTER the port is open.
    This ensures Azure startup probes (TCP 3009) pass without waiting for
    RAG models, RabbitMQ, or ML model loading.
    """
    # Store references for cleanup
    app.state.consumer = None
    app.state.scheduler = None

    # ── Pre-load sentence-transformers in MAIN thread ─────────────────────
    # PyTorch (pulled by sentence-transformers) segfaults (exit 139) when
    # loaded in a daemon thread while TensorFlow is already initialised.
    # Trigger the lazy singleton here so the model is warm before any
    # background thread touches it.
    try:
        from rag.embedder import _get_model
        _get_model()
        logger.info("Embedding model pre-loaded in main thread")
    except Exception as e:
        logger.warning(f"Embedding model pre-load failed (non-fatal): {e}")

    def _background_init():
        """Run all heavy init in a single background thread."""
        try:
            # 1. RAG module (Qdrant connection + pipeline wiring)
            # NOTE: sentence-transformers model is already loaded above
            global rag_pipeline, rag_indexer
            try:
                from rag.vector_store import VectorStore
                from rag.indexer import RAGIndexer
                from rag.retriever import Retriever
                from rag.pipeline import RAGPipeline

                vector_store = VectorStore()
                rag_indexer = RAGIndexer(catalog_store, vector_store)
                retriever = Retriever(vector_store)
                rag_pipeline = RAGPipeline(retriever, redis_client)
                logger.info("RAG module initialised")
            except Exception as e:
                logger.warning(f"RAG module init failed (non-fatal): {e}")

            # 2. RabbitMQ consumer
            model_manager = scoring_engine.model_manager
            consumer = EventConsumer(
                user_store, popularity_store, catalog_store,
                model_manager=model_manager, rag_indexer=rag_indexer,
            )
            app.state.consumer = consumer
            consumer_thread = threading.Thread(
                target=_start_consumer, args=(consumer,), daemon=True,
            )
            consumer_thread.start()

            # 3. Model scheduler
            drift_monitor = DriftMonitor(catalog_store, model_manager, scoring_engine)
            scheduler = ModelScheduler(model_manager, drift_monitor, rag_indexer=rag_indexer)
            app.state.scheduler = scheduler
            scheduler.start()

            logger.info("Background init complete (RAG + consumer + scheduler)")
        except Exception as e:
            logger.error(f"Background init failed: {e}")

    # Spawn background init THEN yield immediately
    init_thread = threading.Thread(target=_background_init, daemon=True)
    init_thread.start()

    logger.info("Recommendation service started (port bound, init in background)")

    yield

    # Shutdown
    if app.state.scheduler:
        app.state.scheduler.stop()
    if app.state.consumer:
        try:
            app.state.consumer.close()
        except Exception as e:
            logger.warning(f"Consumer close error (ignored): {e}")
    user_store.close()
    popularity_store.close()
    catalog_store.close()
    logger.info("Recommendation service shutdown")


def _start_consumer(consumer: EventConsumer) -> None:
    """Run the RabbitMQ consumer in a blocking loop.

    Intended to be executed inside a daemon thread so it does not block
    the main async event loop.

    Args:
        consumer: Fully configured ``EventConsumer`` instance.
    """
    try:
        consumer.connect()
        consumer.start_consuming()
    except Exception as e:
        logger.error(f"Consumer failed: {e}")


app = FastAPI(
    title="Unibuddy Recommendation Service",
    version="1.0.0",
    lifespan=lifespan,
)

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware that propagates an ``x-correlation-id`` header.

    If the incoming request carries the header it is reused; otherwise a
    new UUID v4 is generated.  The ID is stored on ``request.state`` and
    echoed back in the response headers.
    """

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
    """Catch-all handler that logs unhandled exceptions with their correlation ID.

    Args:
        request: The incoming HTTP request.
        exc: The unhandled exception.

    Returns:
        A 500 ``JSONResponse`` containing the correlation ID.
    """
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error(f"[{correlation_id}] Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "correlationId": correlation_id}
    )


# ─── Health endpoints  ───────────────────────────────────────────────────

health_router = APIRouter(prefix="/v1/health", tags=["health"])


@health_router.get("", response_model=HealthResponse)
async def health():
    """Return a full health report including system phase and aggregate stats.

    Returns:
        HealthResponse: Contains ``status``, current ``phase``,
        ``totalInteractions``, ``totalUsers``, and ``totalItems``.
    """
    return {
        "status": "healthy",
        "phase": scoring_engine.detect_phase(),
        "totalInteractions": user_store.get_total_interactions(),
        "totalUsers": user_store.get_total_users_with_interactions(),
        "totalItems": popularity_store.get_total_items(),
    }


@health_router.get("/liveness")
async def liveness():
    """Lightweight liveness probe.

    Always returns ``{"status": "ok"}`` with a UTC timestamp.  Used by the
    gateway's ``GatewayHealthController`` to verify the process is alive.

    Returns:
        dict: ``{"status": "ok", "timestamp": "..."}``.
    """
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@health_router.get("/readiness")
async def readiness():
    """Readiness probe — verifies MongoDB connectivity.

    Sends a ``ping`` command to the MongoDB server.  Returns 200 on success
    or 503 (Service Unavailable) if the database is unreachable.

    Returns:
        dict | JSONResponse: ``{"status": "ok"}`` on success, or a 503
        response with the error detail.
    """
    try:
        user_store._db.command("ping")
        return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(status_code=503, content={"status": "unavailable", "error": str(e)})


app.include_router(health_router)


# ─── Recommendation endpoints ───────────────────────────────────────────────────

rec_router = APIRouter(prefix="/v1/recommendation", tags=["recommendation"])


@rec_router.get("/recommend", response_model=RecommendResponse)
async def recommend(
    userId: str = Query(..., description="User ID to get recommendations for"),
    limit: int = Query(10, ge=1, le=50),
    contentType: str | None = Query(None, description="RESOURCE | TUTORIAL | RESOURCE_COLLECTION | TUTORIAL_COLLECTION"),
):
    """Generate personalised content recommendations for a user.

    The result is cached in Redis (key ``rec:{userId}:{contentType}:{limit}``)
    for ``RECOMMENDATION_CACHE_TTL`` seconds.  On a cache miss the scoring
    engine is invoked (ML or rule-based depending on phase/tier).

    Args:
        userId: Unique identifier of the requesting user.
        limit: Maximum number of items to return (1–50, default 10).
        contentType: Optional filter — one of ``RESOURCE``, ``TUTORIAL``,
            ``RESOURCE_COLLECTION``, ``TUTORIAL_COLLECTION``.

    Returns:
        RecommendResponse: Recommendations with scores, strategy, and phase.
    """
    # Check Redis cache
    cache_key = f"rec:{userId}:{contentType}:{limit}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Redis get failed: {e}")

    # Generate recommendations
    result = scoring_engine.recommend(userId, limit, contentType)

    # Cache result
    try:
        redis_client.setex(cache_key, RECOMMENDATION_CACHE_TTL, json.dumps(result))
    except Exception as e:
        logger.warning(f"Redis set failed: {e}")

    return result


@rec_router.get("/trending", response_model=TrendingResponse)
async def trending(
    majorId: str | None = Query(None),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(10, ge=1, le=50),
):
    """Return trending content items ranked by aggregate popularity.

    Items are sorted by ``trendingScore`` from the popularity store.  The
    response aggregates view, like, and purchase counts per item.

    Args:
        majorId: Optional major to scope the trending list.
        days: Trend window in days (1–30, default 7).
        limit: Maximum items to return (1–50, default 10).

    Returns:
        TrendingResponse: Trending items with interaction totals and ratings.
    """
    items = popularity_store.get_popular_items(majorId, limit)

    return {
        "majorId": majorId,
        "period": f"{days}d",
        "items": [
            {
                "itemId": item["itemId"],
                "itemType": item.get("itemType", ""),
                "totalInteractions": sum([
                    item.get("stats", {}).get("viewCount", 0),
                    item.get("stats", {}).get("likeCount", 0),
                    item.get("stats", {}).get("purchaseCount", 0),
                ]),
                "avgRating": item.get("avgRating", 0.0),
            }
            for item in items
        ],
    }


# ─── ML Model Management ───────────────────────────────────────────────────────

def _notify_training_result(result: dict) -> None:
    """Publish a training result notification to ``notification-service`` via RabbitMQ.

    Publishes to exchange ``notification.events`` with routing key
    ``recommendation.model.trained``.  The payload includes training metrics,
    evaluation scores, and model version.

    Args:
        result: Dictionary returned by ``Trainer.train()`` containing keys
            such as ``status``, ``output_dir``, ``eval_final``, etc.
    """
    import pika
    from config import RABBITMQ_URL

    try:
        params = pika.URLParameters(RABBITMQ_URL)
        conn = pika.BlockingConnection(params)
        ch = conn.channel()

        status = result.get("status", "unknown")
        output_dir = result.get("output_dir", "")
        version = output_dir.split("/")[-1] if output_dir else "N/A"

        eval_final = result.get("eval_final", {})
        eval_baseline = result.get("eval_baseline", {})

        payload = {
            "email": "minhpnq1807@gmail.com",
            "status": status,
            "version": version,
            "timestamp": result.get("timestamp", ""),
            "epochs": result.get("epochs", 0),
            "fineTuneRounds": result.get("fine_tune_rounds", 0),
            "totalPairs": result.get("total_pairs", 0),
            "positivePairs": result.get("positive_pairs", 0),
            "finalLoss": round(result.get("final_loss", 0), 6),
            "finalAccuracy": round(result.get("final_accuracy", 0) * 100, 2),
            "valLoss": round(result.get("val_loss", 0), 6),
            "valAccuracy": round(result.get("val_accuracy", 0) * 100, 2),
            "vocabSizes": result.get("vocab_sizes", {}),
            "evalBaseline": {
                "hitrateAt50": eval_baseline.get("hitrate@50", 0),
                "mrr": eval_baseline.get("mrr", 0),
                "usersEvaluated": eval_baseline.get("users_evaluated", 0),
            },
            "evalFinal": {
                "hitrateAt50": eval_final.get("hitrate@50", 0),
                "mrr": eval_final.get("mrr", 0),
                "usersEvaluated": eval_final.get("users_evaluated", 0),
            },
            "reason": result.get("reason", ""),
            "threshold": result.get("threshold", 0),
        }

        message = {
            "payload": payload,
            "correlationId": str(uuid.uuid4()),
        }

        ch.basic_publish(
            exchange="notification.events",
            routing_key="recommendation.model.trained",
            body=json.dumps(message),
            properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
        )
        conn.close()
        logger.info(f"Training notification published: status={status}, version={version}")
    except Exception as e:
        logger.error(f"Failed to publish training notification: {e}")


@rec_router.post("/model/train")
async def train_model(
    epochs: int = Query(10, ge=1, le=100),
    batch_size: int = Query(256, ge=32, le=2048),
):
    """Trigger a full Two-Tower model training run in a background thread.

    The endpoint returns immediately with ``training_started``.  On
    completion the model is hot-reloaded and an admin notification is sent
    via RabbitMQ regardless of outcome.

    Args:
        epochs: Number of training epochs (1–100, default 10).
        batch_size: Mini-batch size (32–2048, default 256).

    Returns:
        dict: ``{"status": "training_started", "epochs": ..., "batch_size": ...}``.
    """
    import threading
    from ml.trainer import Trainer

    def _train():
        trainer = Trainer()
        try:
            result = trainer.train(epochs=epochs, batch_size=batch_size)
            if result.get("status") == "completed":
                scoring_engine.reload_model()
                logger.info(f"Model trained and reloaded: {result}")
            else:
                logger.warning(f"Training skipped: {result}")
            # Notify admin regardless of outcome
            _notify_training_result(result)
        except Exception as e:
            logger.error(f"Training failed: {e}")
            _notify_training_result({
                "status": "error",
                "reason": str(e),
            })
        finally:
            trainer.close()

    thread = threading.Thread(target=_train, daemon=True)
    thread.start()
    return {"status": "training_started", "epochs": epochs, "batch_size": batch_size}


@rec_router.post("/model/reload")
async def reload_model():
    """Hot-reload the latest trained model artifacts without restarting.

    Delegates to ``ScoringEngine.reload_model()`` which loads the newest
    version from the artifacts directory.

    Returns:
        dict: ``{"status": "loaded" | "no_model", "version": ...}``.
    """
    loaded = scoring_engine.reload_model()
    return {
        "status": "loaded" if loaded else "no_model",
        "version": scoring_engine.model_manager.active_version,
    }


@rec_router.get("/model/versions")
async def model_versions():
    """List all available model versions stored in the artifacts directory.

    Returns:
        dict: ``{"activeVersion": ..., "versions": [...]}`` where each
        version entry includes accuracy, loss, and timestamp.
    """
    return {
        "activeVersion": scoring_engine.model_manager.active_version,
        "versions": scoring_engine.model_manager.list_versions(),
    }


@rec_router.get("/model/info")
async def model_info():
    """Return diagnostic information for the currently active model.

    Includes embedding dimension, temperature, FAISS index size, and the
    full ``metrics.json`` from the active model version.

    Returns:
        dict: Model metadata and runtime state.
    """
    return scoring_engine.model_manager.get_model_info()


@rec_router.post("/model/rebuild-index")
async def rebuild_index():
    """Force-rebuild the FAISS ANN index from the current catalog.

    Fetches all items from the catalog store, computes item-tower
    embeddings, and replaces the in-memory FAISS index.

    Returns:
        dict: ``{"status": "rebuilt", "items_indexed": N}``.
    """
    items = catalog_store.get_all_items()
    count = scoring_engine.model_manager.rebuild_index(items)
    return {"status": "rebuilt", "items_indexed": count}


app.include_router(rec_router)


# ─── RAG endpoints ──────────────────────────────────────────────────────────────

rag_router = APIRouter(prefix="/v1/rag", tags=["rag"])


@rag_router.post("/ask", response_model=RAGResponse)
async def rag_ask(body: RAGRequest):
    """Answer a question using RAG (Retrieval-Augmented Generation).

    Embeds the query, retrieves top-k relevant content chunks from Qdrant,
    and generates a grounded answer using Gemini LLM.

    Args:
        body: RAGRequest with ``query`` and optional filters.

    Returns:
        RAGResponse with ``answer``, ``sources``, and timing metrics.
    """
    if not rag_pipeline:
        return JSONResponse(status_code=503, content={"message": "RAG module not available"})

    filters = {}
    if body.majorId:
        filters["majorId"] = body.majorId
    if body.courseId:
        filters["courseId"] = body.courseId

    result = rag_pipeline.ask(
        query=body.query,
        user_id=body.userId,
        filters=filters or None,
        top_k=body.topK,
    )
    return result


@rag_router.post("/index")
async def rag_index():
    """Trigger a full re-index of all AVAILABLE content into the vector store.

    Returns:
        Dict with ``items_read``, ``items_indexed``, ``chunks_indexed``.
    """
    if not rag_indexer:
        return JSONResponse(status_code=503, content={"message": "RAG module not available"})

    import threading

    def _index():
        try:
            result = rag_indexer.index_all()
            logger.info(f"RAG full re-index completed: {result}")
        except Exception as e:
            logger.error(f"RAG re-index failed: {e}")

    thread = threading.Thread(target=_index, daemon=True)
    thread.start()
    return {"status": "indexing_started"}


@rag_router.get("/health")
async def rag_health():
    """RAG module health check."""
    if not rag_pipeline:
        return JSONResponse(status_code=503, content={"status": "unavailable", "reason": "RAG module not initialised"})
    return {"status": "ok"}


@rag_router.get("/stats")
async def rag_stats():
    """Return vector store collection statistics."""
    if not rag_indexer:
        return JSONResponse(status_code=503, content={"status": "unavailable"})

    try:
        from rag.vector_store import VectorStore
        vs = VectorStore()
        info = vs.get_collection_info()
        return {"status": "ok", "collection": info}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "error": str(e)})


app.include_router(rag_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, access_log=False)
