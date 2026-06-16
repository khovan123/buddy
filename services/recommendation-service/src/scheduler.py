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

    def __init__(self, model_manager, catalog_store=None, drift_monitor=None):
        self._model_manager = model_manager
        self._catalog_store = catalog_store
        self._drift_monitor = drift_monitor
        self._timers: list[threading.Timer] = []
        self._retrain_lock = threading.Lock()
        self._stopped = threading.Event()

    def start(self) -> None:
        """Start all scheduled jobs."""
        self._stopped.clear()
        self._schedule_faiss_rebuild()
        if self._drift_monitor:
            self._schedule_drift_check()

        logger.info(
            f"ModelScheduler started: FAISS rebuild every {FAISS_REBUILD_INTERVAL_HOURS}h, "
            f"drift check every {RETRAIN_INTERVAL_HOURS}h"
        )

    def stop(self) -> None:
        """Cancel all pending timers."""
        self._stopped.set()
        for timer in self._timers:
            timer.cancel()
            if timer.is_alive():
                timer.join(timeout=2)
        self._timers.clear()
        logger.info("ModelScheduler stopped")

    # ─── FAISS Rebuild ──────────────────────────────────────────────────

    def _schedule_faiss_rebuild(self) -> None:
        if self._stopped.is_set():
            return
        interval = FAISS_REBUILD_INTERVAL_HOURS * 3600
        timer = threading.Timer(interval, self._run_faiss_rebuild)
        timer.daemon = True
        timer.start()
        self._timers.append(timer)

    def _run_faiss_rebuild(self) -> None:
        try:
            if self._stopped.is_set():
                return
            if not self._catalog_store:
                logger.warning("Scheduled FAISS rebuild skipped: catalog store is not configured")
                return

            logger.info("Scheduled FAISS index rebuild starting...")
            items = self._catalog_store.get_all_items()
            count = self._model_manager.rebuild_index(items)
            logger.info(f"Scheduled FAISS rebuild complete: {count} items indexed")
        except Exception as e:
            logger.error(f"Scheduled FAISS rebuild failed: {e}")
        finally:
            # Re-schedule
            if not self._stopped.is_set():
                self._schedule_faiss_rebuild()

    # ─── Drift Check + Retrain ──────────────────────────────────────────

    def _schedule_drift_check(self) -> None:
        if self._stopped.is_set():
            return
        interval = RETRAIN_INTERVAL_HOURS * 3600
        timer = threading.Timer(interval, self._run_drift_check)
        timer.daemon = True
        timer.start()
        self._timers.append(timer)

    def _run_drift_check(self) -> None:
        try:
            if self._stopped.is_set():
                return
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
            if not self._stopped.is_set():
                self._schedule_drift_check()
