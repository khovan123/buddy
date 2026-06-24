"""
FastAPI server — recommendation API + health endpoints.

Cloud Run production-ready version for recommendation-service.

Key properties:
- Binds PORT immediately; heavy Mongo/Redis/ML/RabbitMQ init runs in background.
- Readiness checks HTTP-serving dependencies only; RabbitMQ consumer is observed, not required.
- Uses bounded thread pool for blocking Mongo/Redis/ML operations.
- Keeps Redis optional/fail-open.
- Keeps RabbitMQ consumer isolated with reconnect/backoff.
- Performs safe shutdown for scheduler, consumer, stores, and executor.
"""

import asyncio
import json
import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import redis
from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import (
    ALLOWED_ORIGINS,
    HOST,
    PORT,
    RECOMMENDATION_CACHE_TTL,
    RECOMMENDATION_CONSUMER_ENABLED,
    REDIS_URL,
)
from consumer import EventConsumer
from ml.drift_monitor import DriftMonitor
from models import HealthResponse, RecommendResponse, TrendingResponse
from scheduler import ModelScheduler
from scoring.engine import ScoringEngine
from stores.catalog_store import CatalogStore
from stores.item_popularity_store import ItemPopularityStore
from stores.user_profile_store import UserProfileStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HEALTH_CHECK_TIMEOUT_SECONDS = 5
RECOMMENDATION_TIMEOUT_SECONDS = 25
BLOCKING_WORKER_LIMIT = 12
SHUTDOWN_JOIN_TIMEOUT_SECONDS = 5

blocking_executor = ThreadPoolExecutor(
    max_workers=BLOCKING_WORKER_LIMIT,
    thread_name_prefix="recommendation-blocking",
)
blocking_slots = threading.BoundedSemaphore(BLOCKING_WORKER_LIMIT)

catalog_store: CatalogStore | None = None
user_store: UserProfileStore | None = None
popularity_store: ItemPopularityStore | None = None
scoring_engine: ScoringEngine | None = None
redis_client: redis.Redis | None = None


def _require_runtime() -> tuple[CatalogStore, UserProfileStore, ItemPopularityStore, ScoringEngine]:
    """Return initialized runtime dependencies or raise 503 while startup is still running."""
    if (
        catalog_store is None
        or user_store is None
        or popularity_store is None
        or scoring_engine is None
    ):
        raise HTTPException(
            status_code=503,
            detail="Recommendation runtime is still initializing",
        )

    return catalog_store, user_store, popularity_store, scoring_engine


async def _run_blocking_with_timeout(
    name: str,
    func,
    *args,
    timeout: int,
    unavailable_status: int = 503,
    **kwargs,
):
    """Run blocking work in a bounded executor and fail fast on slow dependencies."""
    if not blocking_slots.acquire(blocking=False):
        logger.warning("%s rejected because blocking worker pool is full", name)
        return JSONResponse(
            status_code=unavailable_status,
            content={"message": f"{name} busy", "status": "unavailable"},
        )

    def _run():
        try:
            return func(*args, **kwargs)
        finally:
            blocking_slots.release()

    loop = asyncio.get_running_loop()

    try:
        future = loop.run_in_executor(blocking_executor, _run)
    except Exception:
        blocking_slots.release()
        raise

    try:
        return await asyncio.wait_for(asyncio.shield(future), timeout=timeout)
    except asyncio.TimeoutError:
        future.add_done_callback(lambda done: _consume_late_blocking_result(name, done))
        logger.warning("%s timed out after %ss", name, timeout)
        return JSONResponse(
            status_code=unavailable_status,
            content={"message": f"{name} timed out", "status": "unavailable"},
        )


def _consume_late_blocking_result(name: str, future) -> None:
    """Consume late executor result so post-timeout exceptions are logged, not leaked."""
    try:
        future.result()
    except Exception as e:
        logger.warning("%s failed after request timed out: %s", name, e)


def _close_store_safely(store, label: str) -> None:
    if not store:
        return

    try:
        store.close()
    except Exception as e:
        logger.warning("%s close error ignored: %s", label, e)


def _close_redis_safely(client: redis.Redis | None) -> None:
    if not client:
        return

    try:
        client.close()
    except Exception as e:
        logger.warning("Redis close error ignored: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start quickly for Cloud Run, initialize heavy dependencies in a background thread."""
    app.state.consumer = None
    app.state.scheduler = None
    app.state.consumer_thread = None
    app.state.init_thread = None
    app.state.shutdown_event = threading.Event()

    def _shutdown_requested() -> bool:
        return app.state.shutdown_event.is_set()

    def _background_init() -> None:
        global catalog_store
        global user_store
        global popularity_store
        global scoring_engine
        global redis_client

        try:
            if _shutdown_requested():
                return

            catalog_store = CatalogStore()
            catalog_store.ping()
            if _shutdown_requested():
                return

            user_store = UserProfileStore()
            popularity_store = ItemPopularityStore()
            if _shutdown_requested():
                return

            scoring_engine = ScoringEngine(
                user_store,
                popularity_store,
                catalog_store,
            )
            if _shutdown_requested():
                return

            try:
                redis_client = redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=10,
                    socket_timeout=10,
                )
                redis_client.ping()
                logger.info("Redis client initialized")
            except Exception:
                redis_client = None
                logger.exception("Redis unavailable; recommendation cache disabled")

            model_manager = scoring_engine.model_manager

            if RECOMMENDATION_CONSUMER_ENABLED:
                consumer_thread = threading.Thread(
                    target=_start_consumer,
                    args=(app, app.state.shutdown_event),
                    name="rabbitmq-consumer",
                    daemon=True,
                )
                app.state.consumer_thread = consumer_thread
                consumer_thread.start()
            else:
                logger.info("Recommendation RabbitMQ consumer disabled by environment")

            drift_monitor = DriftMonitor(
                catalog_store,
                model_manager,
                scoring_engine,
            )
            scheduler = ModelScheduler(
                model_manager,
                catalog_store=catalog_store,
                drift_monitor=drift_monitor,
            )
            app.state.scheduler = scheduler
            if not _shutdown_requested():
                scheduler.start()

            logger.info("Background init complete")

        except Exception:
            logger.exception("Background init failed")

            _close_store_safely(user_store, "UserProfileStore")
            _close_store_safely(popularity_store, "ItemPopularityStore")
            _close_store_safely(catalog_store, "CatalogStore")

            catalog_store = None
            user_store = None
            popularity_store = None
            scoring_engine = None
            redis_client = None

    init_thread = threading.Thread(
        target=_background_init,
        daemon=True,
        name="recommendation-background-init",
    )
    app.state.init_thread = init_thread
    init_thread.start()

    logger.info("Recommendation service started; port binding is not blocked by init")

    yield

    app.state.shutdown_event.set()

    scheduler = getattr(app.state, "scheduler", None)
    if scheduler:
        try:
            scheduler.stop()
        except Exception as e:
            logger.warning("Scheduler stop error ignored: %s", e)

    consumer = getattr(app.state, "consumer", None)
    if consumer:
        try:
            consumer.close()
        except Exception as e:
            logger.warning("Consumer close error ignored: %s", e)

    consumer_thread = getattr(app.state, "consumer_thread", None)
    if consumer_thread and consumer_thread.is_alive():
        consumer_thread.join(timeout=SHUTDOWN_JOIN_TIMEOUT_SECONDS)
        if consumer_thread.is_alive():
            logger.warning("Consumer thread did not stop before shutdown timeout")

    init_thread = getattr(app.state, "init_thread", None)
    if init_thread and init_thread.is_alive():
        init_thread.join(timeout=SHUTDOWN_JOIN_TIMEOUT_SECONDS)
        if init_thread.is_alive():
            logger.warning("Background init thread did not stop before shutdown timeout")

    _close_redis_safely(redis_client)
    _close_store_safely(user_store, "UserProfileStore")
    _close_store_safely(popularity_store, "ItemPopularityStore")
    _close_store_safely(catalog_store, "CatalogStore")

    blocking_executor.shutdown(wait=False, cancel_futures=True)
    logger.info("Recommendation service shutdown")


def _start_consumer(app: FastAPI, shutdown_event: threading.Event) -> None:
    """Run RabbitMQ consumer independently from HTTP readiness."""
    if not RECOMMENDATION_CONSUMER_ENABLED:
        return

    retry_delay = 5

    while not shutdown_event.is_set():
        consumer = None

        try:
            if (
                user_store is None
                or popularity_store is None
                or catalog_store is None
                or scoring_engine is None
            ):
                logger.warning(
                    "Recommendation runtime not ready. Retry consumer in %ss...",
                    retry_delay,
                )
                shutdown_event.wait(timeout=retry_delay)
                retry_delay = min(retry_delay * 2, 60)
                continue

            consumer = EventConsumer(
                user_store,
                popularity_store,
                catalog_store,
                model_manager=scoring_engine.model_manager,
            )

            consumer.connect()
            app.state.consumer = consumer
            retry_delay = 5
            consumer.start_consuming()

        except Exception:
            if shutdown_event.is_set():
                break
            logger.exception(
                "Consumer crashed. Restarting in %ss...",
                retry_delay,
            )

        finally:
            app.state.consumer = None

            if consumer:
                try:
                    consumer.close()
                except Exception:
                    pass

        shutdown_event.wait(timeout=retry_delay)
        retry_delay = min(retry_delay * 2, 60)

    logger.info("Recommendation consumer loop stopped")


app = FastAPI(
    title="Buddy Recommendation Service",
    version="1.0.0",
    lifespan=lifespan,
)


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
        content={
            "message": "Internal server error",
            "correlationId": correlation_id,
        },
    )


health_router = APIRouter(prefix="/v1/health", tags=["health"])


@health_router.get("", response_model=HealthResponse)
async def health():
    try:
        _require_runtime()
        status = "healthy"
    except HTTPException:
        status = "starting"

    return {
        "status": status,
        "phase": scoring_engine.phase if scoring_engine else "starting",
        "totalInteractions": -1,
        "totalUsers": -1,
        "totalItems": -1,
    }


@health_router.get("/liveness")
async def liveness():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@health_router.get("/readiness")
async def readiness():
    try:
        catalog, _, _, _ = _require_runtime()
    except HTTPException:
        return JSONResponse(
            status_code=503,
            content={"status": "starting"},
        )

    try:
        result = await _run_blocking_with_timeout(
            "readiness check",
            catalog.ping,
            timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
        )

        if isinstance(result, JSONResponse):
            return result

        return {
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error("Readiness check failed: %s", e)
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "error": str(e),
            },
        )


app.include_router(health_router)


rec_router = APIRouter(prefix="/v1/recommendation", tags=["recommendation"])


def _with_catalog_display(items: list[dict]) -> list[dict]:
    catalog, _, _, _ = _require_runtime()

    catalog_by_id = catalog.get_items_by_ids(
        [item.get("itemId", "") for item in items],
    )

    enriched = []

    for item in items:
        catalog_item = catalog_by_id.get(item.get("itemId"), {})
        enriched.append(
            {
                **item,
                "display": {
                    "title": catalog_item.get("title", ""),
                    "slug": catalog_item.get("slug", ""),
                    "itemType": catalog_item.get("itemType", item.get("itemType", "")),
                    "ownerId": catalog_item.get("ownerId", ""),
                    "majorId": catalog_item.get("majorId", ""),
                    "courseId": catalog_item.get("courseId", ""),
                },
            },
        )

    return enriched


async def _attach_catalog_display(items: list[dict]) -> list[dict]:
    if not items:
        return items

    result = await _run_blocking_with_timeout(
        "catalog display lookup",
        _with_catalog_display,
        items,
        timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
        unavailable_status=200,
    )

    if isinstance(result, JSONResponse):
        logger.warning("Catalog display lookup unavailable; returning scored items only")
        return items

    return result


def _filter_self_owned_items(items: list[dict], user_id: str) -> list[dict]:
    """Remove content owned by the requesting user from recommendation results."""
    if not items:
        return items

    return [
        item for item in items
        if item.get("display", {}).get("ownerId") != user_id
    ]


@rec_router.get("/recommend", response_model=RecommendResponse)
async def recommend(
    userId: str = Query(..., description="User ID to get recommendations for"),
    limit: int = Query(10, ge=1),
    contentType: str | None = Query(
        None,
        description="RESOURCE | TUTORIAL | RESOURCE_COLLECTION | TUTORIAL_COLLECTION",
    ),
):
    _, _, _, engine = _require_runtime()
    cache = redis_client
    cache_key = f"rec:{userId}:{contentType}:{limit}"

    if cache:
        try:
            cached = await _run_blocking_with_timeout(
                "recommendation cache read",
                cache.get,
                cache_key,
                timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
            )

            if not isinstance(cached, JSONResponse) and cached:
                result = json.loads(cached)
                result["recommendations"] = await _attach_catalog_display(
                    result.get("recommendations", []),
                )
                result["recommendations"] = _filter_self_owned_items(
                    result.get("recommendations", []),
                    userId,
                )
                return result

        except Exception as e:
            logger.warning("Redis get failed: %s", e)

    result = await _run_blocking_with_timeout(
        "recommendation scoring",
        engine.recommend,
        userId,
        limit,
        contentType,
        timeout=RECOMMENDATION_TIMEOUT_SECONDS,
    )

    if isinstance(result, JSONResponse):
        return result

    result["recommendations"] = await _attach_catalog_display(
        result.get("recommendations", []),
    )
    result["recommendations"] = _filter_self_owned_items(
        result.get("recommendations", []),
        userId,
    )

    if cache:
        try:
            await _run_blocking_with_timeout(
                "recommendation cache write",
                cache.setex,
                cache_key,
                RECOMMENDATION_CACHE_TTL,
                json.dumps(result),
                timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
            )
        except Exception as e:
            logger.warning("Redis set failed: %s", e)

    return result


@rec_router.get("/trending", response_model=TrendingResponse)
async def trending(
    majorId: str | None = Query(None),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(10, ge=1),
):
    _, _, popularity, _ = _require_runtime()

    items = await _run_blocking_with_timeout(
        "trending lookup",
        popularity.get_popular_items,
        majorId,
        limit,
        timeout=RECOMMENDATION_TIMEOUT_SECONDS,
    )

    if isinstance(items, JSONResponse):
        return items

    response_items = [
        {
            "itemId": item["itemId"],
            "itemType": item.get("itemType", ""),
            "totalInteractions": sum(
                [
                    item.get("stats", {}).get("viewCount", 0),
                    item.get("stats", {}).get("likeCount", 0),
                    item.get("stats", {}).get("purchaseCount", 0),
                ],
            ),
            "avgRating": item.get("avgRating", 0.0),
        }
        for item in items
    ]

    return {
        "majorId": majorId,
        "period": f"{days}d",
        "items": await _attach_catalog_display(response_items),
    }


def _notify_training_result(result: dict) -> None:
    import pika
    from config import RABBITMQ_URL

    if not RABBITMQ_URL:
        logger.warning("RABBITMQ_URL not configured; skip training notification")
        return

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
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
            ),
        )

        conn.close()
        logger.info("Training notification published: status=%s, version=%s", status, version)

    except Exception as e:
        logger.error("Failed to publish training notification: %s", e)


@rec_router.post("/model/train")
async def train_model(
    epochs: int = Query(10, ge=1, le=100),
    batch_size: int = Query(256, ge=32, le=2048),
):
    _, _, _, engine = _require_runtime()

    from ml.trainer import Trainer

    def _notify_async(payload: dict) -> None:
        threading.Thread(
            target=_notify_training_result,
            args=(payload,),
            daemon=True,
            name="training-notification",
        ).start()

    def _train():
        trainer = Trainer()

        try:
            result = trainer.train(epochs=epochs, batch_size=batch_size)

            if result.get("status") == "completed":
                engine.reload_model()
                logger.info("Model trained and reloaded: %s", result)
            else:
                logger.warning("Training skipped: %s", result)

            _notify_async(result)

        except Exception as e:
            logger.error("Training failed: %s", e)
            _notify_async(
                {
                    "status": "error",
                    "reason": str(e),
                },
            )

        finally:
            trainer.close()

    thread = threading.Thread(
        target=_train,
        daemon=True,
        name="model-training",
    )
    thread.start()

    return {
        "status": "training_started",
        "epochs": epochs,
        "batch_size": batch_size,
    }


@rec_router.post("/model/reload")
async def reload_model():
    _, _, _, engine = _require_runtime()

    loaded = await _run_blocking_with_timeout(
        "model reload",
        engine.reload_model,
        timeout=RECOMMENDATION_TIMEOUT_SECONDS,
    )

    if isinstance(loaded, JSONResponse):
        return loaded

    return {
        "status": "loaded" if loaded else "no_model",
        "version": engine.model_manager.active_version,
    }


@rec_router.get("/model/versions")
async def model_versions():
    _, _, _, engine = _require_runtime()

    versions = await _run_blocking_with_timeout(
        "model versions lookup",
        engine.model_manager.list_versions,
        timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
    )

    if isinstance(versions, JSONResponse):
        return versions

    return {
        "activeVersion": engine.model_manager.active_version,
        "versions": versions,
    }


@rec_router.get("/model/info")
async def model_info():
    _, _, _, engine = _require_runtime()

    return await _run_blocking_with_timeout(
        "model info lookup",
        engine.model_manager.get_model_info,
        timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
    )


@rec_router.post("/model/rebuild-index")
async def rebuild_index():
    catalog, _, _, engine = _require_runtime()

    def _rebuild() -> int:
        items = catalog.get_all_items()
        return engine.model_manager.rebuild_index(items)

    count = await _run_blocking_with_timeout(
        "model index rebuild",
        _rebuild,
        timeout=RECOMMENDATION_TIMEOUT_SECONDS,
    )

    if isinstance(count, JSONResponse):
        return count

    return {
        "status": "rebuilt",
        "items_indexed": count,
    }


app.include_router(rec_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT, access_log=False)
