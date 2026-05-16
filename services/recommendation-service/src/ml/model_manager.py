"""
Model manager — handles model versioning, loading, and serving.

Directory structure:
  artifacts/
    model_20260427_120000/    ← version 1
      user_tower.keras
      item_tower.keras
      full_model.weights.h5
      vocab.json
      model_config.json       ← NEW: type_map, feature schema, temperature
      item_index.faiss
      item_ids.json
      metrics.json
    model_20260428_060000/    ← version 2 (latest)
      ...

Serving flow:
  Request → encode(user_features, vocab.json) → user_tower.predict()
          → FAISS.search(user_emb, top_k) → item IDs + scores
"""

import os
import json
import time
import logging
import numpy as np
from pathlib import Path

from config import ARTIFACTS_DIR

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages model lifecycle: load, switch versions, compute embeddings."""

    def __init__(self, artifacts_dir: str = ARTIFACTS_DIR):
        self.artifacts_dir = artifacts_dir
        self._user_tower = None
        self._item_tower = None
        self._vocab = None
        self._model_config: dict | None = None
        self._active_version: str | None = None
        self._faiss_index = None
        self._faiss_item_ids: list[str] = []

    @property
    def is_loaded(self) -> bool:
        return self._user_tower is not None

    @property
    def active_version(self) -> str | None:
        return self._active_version

    def list_versions(self) -> list[dict]:
        """List all available model versions with metrics."""
        versions = []
        base = Path(self.artifacts_dir)
        if not base.exists():
            return []

        for d in sorted(base.iterdir()):
            if not d.is_dir() or d.name == "active":
                continue
            metrics_path = d / "metrics.json"
            if metrics_path.exists():
                with open(metrics_path) as f:
                    metrics = json.load(f)
                versions.append({
                    "version": d.name,
                    "path": str(d),
                    "status": metrics.get("status", "unknown"),
                    "timestamp": metrics.get("timestamp", ""),
                    "accuracy": metrics.get("val_accuracy", 0),
                    "loss": metrics.get("val_loss", 0),
                    "total_pairs": metrics.get("total_pairs", 0),
                })
        return versions

    def get_latest_version(self) -> str | None:
        """Get the most recent model version directory."""
        versions = self.list_versions()
        completed = [v for v in versions if v["status"] == "completed"]
        if not completed:
            return None
        return completed[-1]["path"]

    def load(self, version_path: str | None = None) -> bool:
        """
        Load a model version. If no path given, loads the latest.
        Returns True if loaded, False if no model available.

        Loads user_tower and item_tower independently for modular serving.
        """
        if version_path is None:
            version_path = self.get_latest_version()

        if not version_path or not os.path.exists(version_path):
            logger.info("No trained model available — using rule-based scoring only")
            return False

        try:
            from tensorflow import keras
            from ml.trainer import VocabEncoder

            # Load vocab
            vocab_path = os.path.join(version_path, "vocab.json")
            self._vocab = VocabEncoder()
            self._vocab.load(vocab_path)

            # Load model config (type_map, feature schema)
            config_path = os.path.join(version_path, "model_config.json")
            if os.path.exists(config_path):
                with open(config_path) as f:
                    self._model_config = json.load(f)
                logger.info(f"Loaded model_config: {list(self._model_config.keys())}")
            else:
                # Fallback for models without config
                self._model_config = {
                    "type_map": {"RESOURCE": 0, "TUTORIAL": 1, "RESOURCE_COLLECTION": 2, "TUTORIAL_COLLECTION": 3},
                    "temperature": 15.0,
                    "embedding_dim": 64,
                }

            # Load towers independently (modular serving)
            self._user_tower = keras.models.load_model(
                os.path.join(version_path, "user_tower.keras")
            )
            self._item_tower = keras.models.load_model(
                os.path.join(version_path, "item_tower.keras")
            )
            self._active_version = os.path.basename(version_path)

            # Load FAISS index
            self._load_faiss_index(version_path)

            logger.info(f"Loaded model version: {self._active_version}")
            return True

        except Exception as e:
            logger.error(f"Failed to load model from {version_path}: {e}")
            self._user_tower = None
            self._item_tower = None
            return False

    def _load_faiss_index(self, version_path: str) -> None:
        """Load FAISS ANN index if saved alongside model artifacts."""
        index_path = os.path.join(version_path, "item_index.faiss")
        ids_path = os.path.join(version_path, "item_ids.json")
        if not os.path.exists(index_path) or not os.path.exists(ids_path):
            logger.info("No FAISS index found — using brute-force retrieval")
            return
        try:
            import faiss
            self._faiss_index = faiss.read_index(index_path)
            with open(ids_path) as f:
                self._faiss_item_ids = json.load(f)
            logger.info(f"FAISS index loaded: {self._faiss_index.ntotal} items")
        except ImportError:
            logger.warning("faiss-cpu not installed — skipping ANN index")
        except Exception as e:
            logger.warning(f"Failed to load FAISS index: {e}")

    @property
    def type_map(self) -> dict:
        """Get item type → integer mapping from model config."""
        if self._model_config:
            return self._model_config.get("type_map", {})
        return {"RESOURCE": 0, "TUTORIAL": 1, "RESOURCE_COLLECTION": 2, "TUTORIAL_COLLECTION": 3}

    def compute_user_embedding(self, user_features: dict) -> np.ndarray | None:
        """Compute user tower embedding for a user (real-time, per-request)."""
        if not self.is_loaded:
            return None

        features = {
            "user_id": np.array([[self._vocab.encode("user_id", user_features.get("userId", ""))]]),
            "user_major_id": np.array([[self._vocab.encode("major_id", user_features.get("majorId", ""))]]),
            "user_course_id": np.array([[self._vocab.encode("course_id", user_features.get("courseId", ""))]]),
            "user_semester": np.array([[float(user_features.get("semester", 0))]]),
            "user_career_id": np.array([[self._vocab.encode("career_id", user_features.get("careerId", ""))]]),
        }

        return self._user_tower.predict(features, verbose=0)[0]

    def compute_item_embedding(self, item_features: dict) -> np.ndarray | None:
        """Compute item tower embedding for a single item."""
        if not self.is_loaded:
            return None

        features = {
            "item_id": np.array([[self._vocab.encode("item_id", item_features.get("itemId", ""))]]),
            "item_type": np.array([[self.type_map.get(item_features.get("itemType", ""), 0)]]),
            "item_major_id": np.array([[self._vocab.encode("major_id", item_features.get("majorId", ""))]]),
            "item_course_id": np.array([[self._vocab.encode("course_id", item_features.get("courseId", ""))]]),
            "item_semester": np.array([[float(item_features.get("semester", 0))]]),
        }

        return self._item_tower.predict(features, verbose=0)[0]

    def compute_item_embeddings_batch(self, items: list[dict]) -> np.ndarray | None:
        """
        Batch-compute item embeddings for all items (periodic, offline).
        Returns (N, embedding_dim) array.
        """
        if not self.is_loaded or not items:
            return None

        item_ids = [it.get("itemId", "") for it in items]
        features = {
            "item_id": np.array([[self._vocab.encode("item_id", iid)] for iid in item_ids]),
            "item_type": np.array([[self.type_map.get(it.get("itemType", ""), 0)] for it in items]),
            "item_major_id": np.array([[self._vocab.encode("major_id", it.get("majorId", ""))] for it in items]),
            "item_course_id": np.array([[self._vocab.encode("course_id", it.get("courseId", ""))] for it in items]),
            "item_semester": np.array([[float(it.get("semester", 0))] for it in items]),
        }

        return self._item_tower.predict(features, verbose=0).astype(np.float32)

    def rebuild_index(self, items: list[dict]) -> int:
        """
        Rebuild FAISS index from current item catalog.
        Called after new items are added or model is retrained.
        Returns number of items indexed.
        """
        if not self.is_loaded:
            return 0

        try:
            import faiss
        except ImportError:
            logger.warning("faiss-cpu not installed — cannot rebuild index")
            return 0

        t0 = time.time()
        embs = self.compute_item_embeddings_batch(items)
        if embs is None or len(embs) == 0:
            return 0

        dim = embs.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embs)

        self._faiss_index = index
        self._faiss_item_ids = [it.get("itemId", "") for it in items]

        # Persist to disk
        if self._active_version:
            version_path = os.path.join(self.artifacts_dir, self._active_version)
            faiss.write_index(index, os.path.join(version_path, "item_index.faiss"))
            with open(os.path.join(version_path, "item_ids.json"), "w") as f:
                json.dump(self._faiss_item_ids, f)

        elapsed = time.time() - t0
        logger.info(f"FAISS index rebuilt: {index.ntotal} items, {dim}D in {elapsed:.1f}s")
        return index.ntotal

    def score_ml(self, user_features: dict, item_features: dict) -> float:
        """
        Compute ML similarity score between a user and an item.
        Returns cosine similarity (0.0–1.0) or 0.0 if no model loaded.
        """
        if not self.is_loaded:
            return 0.0

        user_emb = self.compute_user_embedding(user_features)
        item_emb = self.compute_item_embedding(item_features)

        if user_emb is None or item_emb is None:
            return 0.0

        # Cosine similarity (already L2-normalized in towers)
        return float(np.dot(user_emb, item_emb))

    def retrieve_similar(self, user_features: dict, top_k: int = 50) -> list[dict] | None:
        """
        ANN retrieval: find top-K items most similar to a user via FAISS.
        Returns list of {itemId, score} sorted by similarity.
        Falls back to None if no FAISS index available.
        """
        if not self.is_loaded or self._faiss_index is None:
            return None

        user_emb = self.compute_user_embedding(user_features)
        if user_emb is None:
            return None

        query = user_emb.reshape(1, -1).astype(np.float32)
        scores, indices = self._faiss_index.search(query, top_k)

        results = []
        for idx, score in zip(indices[0], scores[0]):
            if 0 <= idx < len(self._faiss_item_ids):
                results.append({"itemId": self._faiss_item_ids[idx], "score": float(score)})
        return results

    def get_model_info(self) -> dict:
        """Return model version, config, and index info for diagnostics."""
        info = {
            "loaded": self.is_loaded,
            "version": self._active_version,
            "faiss_loaded": self._faiss_index is not None,
            "faiss_items": self._faiss_index.ntotal if self._faiss_index else 0,
        }
        if self._model_config:
            info["embedding_dim"] = self._model_config.get("embedding_dim", 64)
            info["temperature"] = self._model_config.get("temperature", 15.0)
        if self._active_version:
            metrics_path = os.path.join(self.artifacts_dir, self._active_version, "metrics.json")
            if os.path.exists(metrics_path):
                with open(metrics_path) as f:
                    info["metrics"] = json.load(f)
        return info
