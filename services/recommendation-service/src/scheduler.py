"""
Model lifecycle scheduler — periodic FAISS rebuild + drift-triggered retrain.

Runs in the main process alongside the FastAPI server and RabbitMQ consumer.
Uses threading.Timer for lightweight scheduling without external deps.
"""

import logging
import threading
from datetime import datetime, timedelta
from config import FAISS_REBUILD_INTERVAL_HOURS, RETRAIN_INTERVAL_HOURS

logger = logging.getLogger(__name__)


class ModelScheduler:
    """Schedules periodic FAISS index rebuilds and drift-check retrain cycles."""

    def __init__(self, model_manager, drift_monitor=None, rag_indexer=None):
        self._model_manager = model_manager
        self._drift_monitor = drift_monitor
        self._rag_indexer = rag_indexer
        self._timers: list[threading.Timer] = []
        self._retrain_lock = threading.Lock()

    def start(self) -> None:
        """Start all scheduled jobs."""
        self._schedule_faiss_rebuild()
        if self._drift_monitor:
            self._schedule_drift_check()
        if self._rag_indexer:
            self._schedule_daily_rag_sync()
            
        logger.info(
            f"ModelScheduler started: FAISS rebuild every {FAISS_REBUILD_INTERVAL_HOURS}h, "
            f"drift check every {RETRAIN_INTERVAL_HOURS}h, and daily RAG sync at midnight"
        )

    def stop(self) -> None:
        """Cancel all pending timers."""
        for timer in self._timers:
            timer.cancel()
        self._timers.clear()
        logger.info("ModelScheduler stopped")

    # ─── FAISS Rebuild ──────────────────────────────────────────────────

    def _schedule_faiss_rebuild(self) -> None:
        interval = FAISS_REBUILD_INTERVAL_HOURS * 3600
        timer = threading.Timer(interval, self._run_faiss_rebuild)
        timer.daemon = True
        timer.start()
        self._timers.append(timer)

    def _run_faiss_rebuild(self) -> None:
        try:
            logger.info("Scheduled FAISS index rebuild starting...")
            self._model_manager.rebuild_index()
            logger.info("Scheduled FAISS rebuild complete")
        except Exception as e:
            logger.error(f"Scheduled FAISS rebuild failed: {e}")
        finally:
            # Re-schedule
            self._schedule_faiss_rebuild()

    # ─── Drift Check + Retrain ──────────────────────────────────────────

    def _schedule_drift_check(self) -> None:
        interval = RETRAIN_INTERVAL_HOURS * 3600
        timer = threading.Timer(interval, self._run_drift_check)
        timer.daemon = True
        timer.start()
        self._timers.append(timer)

    def _run_drift_check(self) -> None:
        try:
            if not self._drift_monitor:
                return

            should_retrain, reason = self._drift_monitor.check()
            if should_retrain:
                if self._retrain_lock.acquire(blocking=False):
                    try:
                        logger.info(f"Drift detected ({reason}) — triggering retrain")
                        self._drift_monitor.trigger_retrain(reason)
                    finally:
                        self._retrain_lock.release()
                else:
                    logger.info("Retrain already in progress — skipping")
            else:
                logger.info("Drift check passed — no retrain needed")
        except Exception as e:
            logger.error(f"Drift check failed: {e}")
        finally:
            self._schedule_drift_check()

    # ─── Daily RAG Sync ─────────────────────────────────────────────────

    def _schedule_daily_rag_sync(self) -> None:
        now = datetime.now()
        tomorrow = now + timedelta(days=1)
        midnight = datetime(year=tomorrow.year, month=tomorrow.month, day=tomorrow.day, hour=0, minute=0, second=0)
        seconds_until_midnight = (midnight - now).total_seconds()
        
        timer = threading.Timer(seconds_until_midnight, self._run_rag_sync)
        timer.daemon = True
        timer.start()
        self._timers.append(timer)
        logger.info(f"Scheduled next daily RAG sync in {seconds_until_midnight / 3600:.2f} hours (at midnight)")

    def _run_rag_sync(self) -> None:
        try:
            if not self._rag_indexer:
                return

            logger.info("Daily RAG sync (re-index) starting...")
            result = self._rag_indexer.index_all()
            logger.info(f"Daily RAG sync complete: {result}")
        except Exception as e:
            logger.error(f"Daily RAG sync failed: {e}")
        finally:
            # Re-schedule for the next midnight
            self._schedule_daily_rag_sync()
