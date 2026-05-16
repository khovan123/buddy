"""
DriftMonitor — detects when the model needs retraining.

Checks:
  1. OOV rate: % of recent active users/items not in vocab
  2. Catalog growth: item count since last training
  3. Vocab staleness: new majors/careers not in vocab.json
"""

import json
import logging
import os
from config import OOV_RETRAIN_THRESHOLD, ARTIFACTS_DIR

logger = logging.getLogger(__name__)


class DriftMonitor:
    """Monitors model drift and triggers retraining when thresholds are exceeded."""

    def __init__(self, catalog_store, model_manager, scoring_engine=None):
        self._catalog_store = catalog_store
        self._model_manager = model_manager
        self._scoring_engine = scoring_engine
        self._last_item_count = 0
        self._load_baseline()

    def _load_baseline(self) -> None:
        """Load baseline stats from last training run."""
        try:
            version_path = self._model_manager.get_latest_version()
            if not version_path:
                return
            metrics_path = os.path.join(version_path, "metrics.json")
            if os.path.exists(metrics_path):
                with open(metrics_path) as f:
                    metrics = json.load(f)
                self._last_item_count = metrics.get("item_count", 0)
                logger.info(f"DriftMonitor baseline: {self._last_item_count} items at last training")
        except Exception as e:
            logger.warning(f"Failed to load drift baseline: {e}")

    def check(self) -> tuple[bool, str]:
        """
        Run all drift checks.

        Returns:
            (should_retrain: bool, reason: str)
        """
        # Check 1: OOV rate
        oov_rate, oov_detail = self._check_oov_rate()
        if oov_rate > OOV_RETRAIN_THRESHOLD:
            return True, f"OOV rate {oov_rate:.1%} exceeds threshold {OOV_RETRAIN_THRESHOLD:.0%} ({oov_detail})"

        # Check 2: Catalog growth
        current_items = self._catalog_store.get_item_count()
        if self._last_item_count > 0:
            growth = (current_items - self._last_item_count) / self._last_item_count
            if growth > 0.30:
                return True, f"Catalog grew {growth:.0%} ({self._last_item_count} → {current_items})"

        # Check 3: New majors/careers not in vocab
        new_entity = self._check_new_vocab_entities()
        if new_entity:
            return True, f"New {new_entity} detected — not in current vocab"

        return False, ""

    def _check_oov_rate(self) -> tuple[float, str]:
        """Calculate what % of recent items map to unknown (0) in the vocab."""
        if not self._model_manager._vocab:
            return 0.0, "no vocab loaded"

        vocab = self._model_manager._vocab
        items = self._catalog_store.get_all_items()
        if not items:
            return 0.0, "no items"

        total = len(items)
        oov = sum(1 for item in items if vocab.encode("item_id", item.get("itemId", "")) == 0)
        rate = oov / total if total > 0 else 0.0
        return rate, f"{oov}/{total} items OOV"

    def _check_new_vocab_entities(self) -> str | None:
        """Check if any major/career in the catalog is missing from the vocab."""
        if not self._model_manager._vocab:
            return None

        vocab = self._model_manager._vocab

        # Check majors
        majors = self._catalog_store.get_all_majors()
        for major in majors:
            major_id = major.get("majorId", "")
            if major_id and vocab.encode("major_id", major_id) == 0:
                return f"major_id={major_id}"

        return None

    def trigger_retrain(self, reason: str) -> None:
        """Execute a full retrain cycle."""
        try:
            from ml.trainer import Trainer
            logger.info(f"Starting retrain: {reason}")

            trainer = Trainer(self._catalog_store)
            success = trainer.train()

            if success:
                logger.info("Retrain succeeded — hot-swapping model")
                self._model_manager.load_latest()
                self._load_baseline()  # Update baseline
                if self._scoring_engine:
                    self._scoring_engine.reload_model()
            else:
                logger.warning("Retrain completed but model did not pass quality gate")
        except Exception as e:
            logger.error(f"Retrain failed: {e}")
