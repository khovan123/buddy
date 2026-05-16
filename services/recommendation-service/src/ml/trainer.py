"""
Batch training pipeline — extracts data from recommendation_db,
builds training pairs, trains the Two-Tower model, evaluates, and saves.

Usage:
  python -m ml.trainer                     # train with default settings
  python -m ml.trainer --epochs 20         # custom epochs
  python -m ml.trainer --output ./v2       # custom output path

This runs as a batch job (cron/scheduler), NOT during serving.
"""

import os
import json
import logging
import argparse
from collections import defaultdict
from datetime import datetime, timezone

import numpy as np
import tensorflow as tf
from tensorflow import keras
from pymongo import MongoClient

from config import MONGO_URI, MONGO_DB_NAME, ARTIFACTS_DIR, MIN_HITRATE
from ml.two_tower import TwoTowerModel

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
TYPE_MAP = {"RESOURCE": 0, "TUTORIAL": 1, "RESOURCE_COLLECTION": 2, "TUTORIAL_COLLECTION": 3}


class VocabEncoder:
    """Maps string IDs to integer indices for embedding layers."""

    def __init__(self):
        self._vocabs: dict[str, dict[str, int]] = {}

    def fit(self, field: str, values: list[str]) -> None:
        unique = sorted(set(v for v in values if v))
        self._vocabs[field] = {v: i + 1 for i, v in enumerate(unique)}  # 0 = unknown

    def encode(self, field: str, value: str) -> int:
        return self._vocabs.get(field, {}).get(value, 0)

    def vocab_size(self, field: str) -> int:
        return len(self._vocabs.get(field, {})) + 1  # +1 for unknown

    def save(self, path: str) -> None:
        with open(path, "w") as f:
            json.dump(self._vocabs, f)

    def load(self, path: str) -> None:
        with open(path) as f:
            self._vocabs = json.load(f)


class Trainer:
    """Batch training pipeline for the Two-Tower model."""

    def __init__(self, db_url: str = MONGO_URI):
        self._client = MongoClient(db_url)
        self._db = self._client.get_database(MONGO_DB_NAME)
        self.encoder = VocabEncoder()

    def _build_item_features_batch(self, item_ids: list[str], item_map: dict, courses: dict) -> dict:
        """Build batched item feature arrays for tower inference. Used by evaluate, fine_tune, and FAISS builder."""
        return {
            "item_id": np.array([[self.encoder.encode("item_id", iid)] for iid in item_ids]),
            "item_type": np.array([[TYPE_MAP.get(item_map[iid].get("itemType", ""), 0)] for iid in item_ids]),
            "item_major_id": np.array([[self.encoder.encode("major_id", item_map[iid].get("majorId", ""))] for iid in item_ids]),
            "item_course_id": np.array([[self.encoder.encode("course_id", item_map[iid].get("courseId", ""))] for iid in item_ids]),
            "item_semester": np.array([[float(courses.get(item_map[iid].get("courseId", ""), {}).get("semester", 0))] for iid in item_ids]),
        }

    def extract_training_data(self) -> tuple[list[dict], list[dict], list[dict]]:
        """
        Extract training data from recommendation_db (our own materialized views).
        Returns (interactions, user_profiles, items).
        """
        # User interaction profiles (has recentItems with positive signals)
        user_profiles = list(self._db.user_interaction_profiles.find(
            {"totalInteractions": {"$gte": 3}},  # min 3 interactions to be useful
        ))

        # Item catalog (local materialized view)
        items = list(self._db.catalog_items.find({}))

        # Item popularity stats
        item_stats = list(self._db.item_popularity.find({}))

        # User profile metadata (from user-service events)
        user_metadata = list(self._db.catalog_user_profiles.find({}))

        logger.info(
            f"Extracted: {len(user_profiles)} users, {len(items)} items, "
            f"{len(item_stats)} item stats, {len(user_metadata)} user metadata"
        )

        return user_profiles, items, user_metadata

    def _build_cf_signals(
        self, user_profiles: list[dict], item_map: dict,
    ) -> list[dict]:
        """Build CF-implied pairs from item-item Jaccard co-interaction."""
        from collections import defaultdict as _dd

        user_items = _dd(set)
        item_users = _dd(set)
        for up in user_profiles:
            uid = str(up.get("userId", ""))
            for ri in up.get("recentItems", []):
                iid = ri.get("itemId", "")
                if iid in item_map:
                    user_items[uid].add(iid)
                    item_users[iid].add(uid)

        def jaccard(a, b):
            ua, ub = item_users.get(a, set()), item_users.get(b, set())
            isect = len(ua & ub)
            return isect / len(ua | ub) if (ua | ub) else 0.0

        # Sparse item-item similarity
        iids = list(item_users.keys())
        item_sim = {}
        for i, a in enumerate(iids):
            for b in iids[i+1:]:
                s = jaccard(a, b)
                if s > 0:
                    item_sim[(a,b)] = s
                    item_sim[(b,a)] = s

        # CF-implied pairs
        cf_pairs = []
        for uid, seen in user_items.items():
            cands = {}
            for iid in seen:
                for other in iids:
                    if other in seen: continue
                    s = item_sim.get((iid, other), 0)
                    if s > 0.1:
                        cands[other] = max(cands.get(other, 0), s)
            for oid, sim in sorted(cands.items(), key=lambda x: -x[1])[:3]:
                cf_pairs.append({"userId": uid, "itemId": oid, "cf_weight": sim})

        logger.info(f"CF signals: {len(item_sim)//2} item-item pairs, {len(cf_pairs)} implied positives")
        return cf_pairs

    def _make_pair(self, uid, iid, meta, item, courses):
        """Create a single feature dict for a (user, item) pair."""
        c_course = item.get("courseId", "")
        c_semester = courses.get(c_course, {}).get("semester", 0)
        return {
            "user_id": self.encoder.encode("user_id", uid),
            "user_major_id": self.encoder.encode("major_id", meta.get("majorId", "")),
            "user_course_id": self.encoder.encode("course_id", meta.get("courseId", "")),
            "user_semester": float(meta.get("semester", 0)),
            "user_career_id": self.encoder.encode("career_id", meta.get("careerId", "")),
            "item_id": self.encoder.encode("item_id", iid),
            "item_type": TYPE_MAP.get(item.get("itemType", ""), 0),
            "item_major_id": self.encoder.encode("major_id", item.get("majorId", "")),
            "item_course_id": self.encoder.encode("course_id", c_course),
            "item_semester": float(c_semester),
        }

    def build_training_pairs(
        self,
        user_profiles: list[dict],
        items: list[dict],
        user_metadata: list[dict],
    ) -> tuple[dict[str, np.ndarray], np.ndarray, np.ndarray]:
        """
        Build (user, item, label, weight) training pairs.

        Positive: user interacted with item (weight=1.0)
        CF-implied: items similar to user history via Jaccard (weight=similarity)
        Negative: random items the user did NOT interact with (weight=1.0)
        """
        item_map = {item.get("itemId", str(item.get("itemId", ""))): item for item in items}
        user_meta_map = {u["userId"]: u for u in user_metadata}
        courses = {doc["courseId"]: doc for doc in self._db.catalog_courses.find({})}

        all_user_ids = [str(p.get("userId", "")) for p in user_profiles]
        all_item_ids = list(item_map.keys())

        self.encoder.fit("user_id", all_user_ids)
        self.encoder.fit("item_id", all_item_ids)
        self.encoder.fit("major_id", [it.get("majorId", "") for it in items] + [u.get("majorId", "") for u in user_metadata])
        self.encoder.fit("course_id", [it.get("courseId", "") for it in items] + [u.get("courseId", "") for u in user_metadata])
        self.encoder.fit("career_id", [u.get("careerId", "") for u in user_metadata])



        pairs, labels, weights = [], [], []

        # Item popularity for hard-negative sampling
        item_pop = defaultdict(int)
        for up in user_profiles:
            for ri in up.get("recentItems", []):
                item_pop[ri.get("itemId", "")] += 1

        for user_profile in user_profiles:
            user_id = str(user_profile.get("_id", ""))
            meta = user_meta_map.get(user_id, {})
            recent_items = user_profile.get("recentItems", [])
            if not recent_items:
                continue

            interacted_ids = set()
            for interaction in recent_items:
                item_id = interaction.get("itemId", "")
                if item_id not in item_map:
                    continue
                interacted_ids.add(item_id)
                pairs.append(self._make_pair(user_id, item_id, meta, item_map[item_id], courses))
                labels.append(1.0); weights.append(1.0)

            # 4× popularity-biased negative sampling
            neg_pool = [iid for iid in all_item_ids if iid not in interacted_ids]
            if not neg_pool:
                continue
            n_negatives = min(len(interacted_ids) * 4, len(neg_pool))
            neg_counts = np.array([item_pop.get(iid, 1) for iid in neg_pool], dtype=float)
            neg_probs = neg_counts / neg_counts.sum()
            for neg_id in np.random.choice(neg_pool, size=n_negatives, replace=False, p=neg_probs):
                pairs.append(self._make_pair(user_id, neg_id, meta, item_map[neg_id], courses))
                labels.append(0.0); weights.append(1.0)

        # CF-implied soft-positive pairs
        cf_pairs_raw = self._build_cf_signals(user_profiles, item_map)
        cf_added = 0
        for cfp in cf_pairs_raw:
            uid, iid, w = cfp["userId"], cfp["itemId"], cfp["cf_weight"]
            if iid not in item_map or uid not in {str(p.get("userId","")) for p in user_profiles}:
                continue
            meta = user_meta_map.get(uid, {})
            pairs.append(self._make_pair(uid, iid, meta, item_map[iid], courses))
            labels.append(1.0); weights.append(w)
            cf_added += 1

        if not pairs:
            logger.warning("No training pairs generated!")
            return {}, np.array([]), np.array([])

        features = {
            key: np.array([p[key] for p in pairs], dtype=np.int32 if "semester" not in key else np.float32)
            for key in pairs[0].keys()
        }
        labels_arr = np.array(labels, dtype=np.float32)
        weights_arr = np.array(weights, dtype=np.float32)

        n_real = int(sum(1 for l, w in zip(labels, weights) if l == 1.0 and w == 1.0))
        logger.info(f"Built {len(pairs)} pairs ({n_real} real pos, {cf_added} CF pos, {len(pairs)-n_real-cf_added} neg)")

        return features, labels_arr, weights_arr

    def _build_faiss_index(self, model: TwoTowerModel, items: list[dict], courses: dict, output_dir: str):
        """Build FAISS ANN index from item tower embeddings."""
        try:
            import faiss
        except ImportError:
            logger.warning("faiss-cpu not installed — skipping ANN index")
            return

        item_map = {it.get("itemId", str(it.get("itemId", ""))): it for it in items}
        all_iids = list(item_map.keys())

        item_feats = self._build_item_features_batch(all_iids, item_map, courses)
        embs = model.item_tower.predict(item_feats, verbose=0).astype(np.float32)

        dim = embs.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embs)
        faiss.write_index(index, os.path.join(output_dir, "item_index.faiss"))
        with open(os.path.join(output_dir, "item_ids.json"), "w") as f:
            json.dump(all_iids, f)

        logger.info(f"FAISS index built: {index.ntotal} items, {dim}D")

    def evaluate(
        self,
        model: TwoTowerModel,
        user_profiles: list[dict],
        items: list[dict],
        user_metadata: list[dict],
        K: int = 50,
    ) -> dict:
        """
        Evaluate HitRate@K and MRR on held-out last-interaction per user.
        For each user with ≥2 interactions, hold out the last one and
        rank it against ALL items.
        """
        item_map = {it.get("itemId", str(it.get("itemId", ""))): it for it in items}
        user_meta_map = {u["userId"]: u for u in user_metadata}
        courses = {doc["courseId"]: doc for doc in self._db.catalog_courses.find({})}

        # Precompute all item embeddings
        all_iids = list(item_map.keys())
        item_feats = self._build_item_features_batch(all_iids, item_map, courses)
        all_item_embs = model.item_tower.predict(item_feats, verbose=0)

        hits, mrr_sum, users_evaluated = 0, 0.0, 0

        for up in user_profiles:
            uid = str(up.get("userId", ""))
            recent = up.get("recentItems", [])
            if len(recent) < 2:
                continue

            held_out_iid = recent[-1].get("itemId", "")
            if held_out_iid not in item_map:
                continue

            meta = user_meta_map.get(uid, {})
            u_feats = {
                "user_id": np.array([[self.encoder.encode("user_id", uid)]]),
                "user_major_id": np.array([[self.encoder.encode("major_id", meta.get("majorId",""))]]),
                "user_course_id": np.array([[self.encoder.encode("course_id", meta.get("courseId",""))]]),
                "user_semester": np.array([[float(meta.get("semester", 0))]]),
                "user_career_id": np.array([[self.encoder.encode("career_id", meta.get("careerId",""))]]),
            }
            u_emb = model.user_tower.predict(u_feats, verbose=0)

            scores = np.dot(all_item_embs, u_emb.T).flatten()
            top_k_idx = np.argsort(-scores)[:K]
            top_k_items = [all_iids[i] for i in top_k_idx]

            users_evaluated += 1
            if held_out_iid in top_k_items:
                hits += 1
                rank = top_k_items.index(held_out_iid) + 1
                mrr_sum += 1.0 / rank

        hitrate = hits / max(users_evaluated, 1)
        mrr = mrr_sum / max(users_evaluated, 1)

        result = {
            "hitrate@50": round(hitrate, 4),
            "mrr": round(mrr, 4),
            "users_evaluated": users_evaluated,
        }
        logger.info(f"Evaluation: {result}")
        return result

    def fine_tune(
        self,
        model: TwoTowerModel,
        user_profiles: list[dict],
        items: list[dict],
        user_metadata: list[dict],
        epochs: int = 15,
        batch_size: int = 128,
        n_hard_per_user: int = 8,
        learning_rate: float = 2e-4,
        hard_neg_weight: float = 1.5,
        n_hard_global: int | None = None,
        n_hard_intra: int | None = None,
    ) -> None:
        """
        Hard negative mining + fine-tuning.
        Uses FAISS to find confusing items per user, then retrains.
        """
        try:
            import faiss
        except ImportError:
            logger.warning("faiss-cpu not installed — skipping fine-tuning")
            return

        item_map = {it.get("itemId", str(it.get("itemId", ""))): it for it in items}
        user_meta_map = {u["userId"]: u for u in user_metadata}
        courses = {doc["courseId"]: doc for doc in self._db.catalog_courses.find({})}

        # Compute all item embeddings + build FAISS index
        all_iids = list(item_map.keys())
        item_feats = self._build_item_features_batch(all_iids, item_map, courses)
        all_item_embs = model.item_tower.predict(item_feats, verbose=0).astype(np.float32)

        # Build FAISS index for global hard negative search
        dim = all_item_embs.shape[1]
        hn_index = faiss.IndexFlatIP(dim)
        hn_index.add(all_item_embs)

        # Pre-build major → item indices for intra-major lookup
        major_to_indices = {}
        for i, iid in enumerate(all_iids):
            m = item_map[iid].get("majorId", "")
            major_to_indices.setdefault(m, []).append(i)

        # Mine hard negatives
        hard_pairs, hard_labels, hard_weights = [], [], []
        n_candidates = n_hard_per_user * 5  # search wider pool
        _n_global = n_hard_global if n_hard_global is not None else n_hard_per_user // 2
        _n_intra = n_hard_intra if n_hard_intra is not None else n_hard_per_user - _n_global

        # Also keep original positives
        for up in user_profiles:
            uid = str(up.get("userId", ""))
            meta = user_meta_map.get(uid, {})
            recent = up.get("recentItems", [])
            interacted = {ri.get("itemId", "") for ri in recent}
            user_major = meta.get("majorId", "")

            # Positive pairs
            for ri in recent:
                iid = ri.get("itemId", "")
                if iid not in item_map:
                    continue
                hard_pairs.append(self._make_pair(uid, iid, meta, item_map[iid], courses))
                hard_labels.append(1.0)
                hard_weights.append(1.0)

            # Strategy 1: FAISS global hard negatives
            u_feats = {
                "user_id": np.array([[self.encoder.encode("user_id", uid)]]),
                "user_major_id": np.array([[self.encoder.encode("major_id", user_major)]]),
                "user_course_id": np.array([[self.encoder.encode("course_id", meta.get("courseId",""))]]),
                "user_semester": np.array([[float(meta.get("semester", 0))]]),
                "user_career_id": np.array([[self.encoder.encode("career_id", meta.get("careerId",""))]]),
            }
            u_emb = model.user_tower.predict(u_feats, verbose=0).astype(np.float32)
            _, top_indices = hn_index.search(u_emb, n_candidates)

            count = 0
            for idx in top_indices[0]:
                neg_iid = all_iids[idx]
                if neg_iid not in interacted:
                    hard_pairs.append(self._make_pair(uid, neg_iid, meta, item_map[neg_iid], courses))
                    hard_labels.append(0.0)
                    hard_weights.append(hard_neg_weight)
                    count += 1
                    if count >= _n_global:
                        break

            # Strategy 2: Intra-major hard negatives
            if user_major and user_major in major_to_indices:
                same_major_idx = major_to_indices[user_major]
                same_major_embs = all_item_embs[same_major_idx]
                scores = np.dot(same_major_embs, u_emb.T).flatten()
                ranked = np.argsort(-scores)
                count = 0
                for rank_pos in ranked:
                    neg_iid = all_iids[same_major_idx[rank_pos]]
                    if neg_iid not in interacted:
                        hard_pairs.append(self._make_pair(uid, neg_iid, meta, item_map[neg_iid], courses))
                        hard_labels.append(0.0)
                        hard_weights.append(hard_neg_weight)
                        count += 1
                        if count >= _n_intra:
                            break

        if not hard_pairs:
            logger.warning("No hard negative pairs generated — skipping fine-tuning")
            return

        ft_features = {
            key: np.array([p[key] for p in hard_pairs], dtype=np.int32 if "semester" not in key else np.float32)
            for key in hard_pairs[0].keys()
        }
        ft_labels = np.array(hard_labels, dtype=np.float32)
        ft_weights = np.array(hard_weights, dtype=np.float32)

        # Balance weights
        n_pos = int(ft_labels.sum())
        n_neg = len(ft_labels) - n_pos
        ratio = n_neg / max(n_pos, 1)
        balanced = np.where(ft_labels == 1.0, ft_weights * ratio, ft_weights)

        logger.info(f"Fine-tune dataset: {len(hard_pairs)} pairs ({n_pos} pos, {n_neg} hard neg)")

        # Recompile with low LR
        ft_lr = keras.optimizers.schedules.CosineDecay(
            initial_learning_rate=learning_rate,
            decay_steps=(len(hard_pairs) // batch_size) * epochs,
            alpha=1e-6 / learning_rate,
        )
        model.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=ft_lr),
            loss=keras.losses.BinaryCrossentropy(from_logits=True),
            metrics=["accuracy"],
        )

        ft_callbacks = [
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=5, restore_best_weights=True, verbose=1
            ),
        ]

        logger.info("Fine-tuning with hard negatives...")
        model.model.fit(
            ft_features, ft_labels,
            epochs=epochs, batch_size=batch_size,
            validation_split=0.2, verbose=1,
            sample_weight=balanced,
            callbacks=ft_callbacks,
        )

    def train(
        self,
        epochs: int = 80,
        batch_size: int = 128,
        validation_split: float = 0.2,
        output_dir: str | None = None,
    ) -> dict:
        """
        Full training pipeline:
          1. Extract data from recommendation_db
          2. Build training pairs (with CF signals)
          3. Train Two-Tower model (with sample weights)
          4. Build FAISS ANN index
          5. Save model + vocab + index to artifacts/
        """
        output_dir = output_dir or os.path.join(
            ARTIFACTS_DIR, f"model_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        )

        # 1. Extract
        user_profiles, items, user_metadata = self.extract_training_data()

        if len(user_profiles) < 10 or len(items) < 5:
            logger.warning("Not enough data for training. Need ≥10 users and ≥5 items.")
            return {"status": "skipped", "reason": "insufficient_data"}

        # 2. Build pairs (includes CF signals)
        features, labels, weights_arr = self.build_training_pairs(user_profiles, items, user_metadata)

        if len(labels) == 0:
            return {"status": "skipped", "reason": "no_training_pairs"}

        # 3. Build model
        vocab_sizes = {
            "user_id": self.encoder.vocab_size("user_id"),
            "item_id": self.encoder.vocab_size("item_id"),
            "major_id": self.encoder.vocab_size("major_id"),
            "course_id": self.encoder.vocab_size("course_id"),
            "career_id": self.encoder.vocab_size("career_id"),
            "item_type": len(TYPE_MAP),
        }

        model = TwoTowerModel(vocab_sizes)
        logger.info(f"Training with vocab sizes: {vocab_sizes}")
        model.model.summary(print_fn=logger.info)

        # Balanced sample weights
        n_pos = int(labels.sum())
        n_neg = len(labels) - n_pos
        ratio = n_neg / max(n_pos, 1)
        balanced_weights = np.where(labels == 1.0, weights_arr * ratio, weights_arr)

        # CosineDecay LR schedule for deeper convergence
        total_steps = (len(labels) // batch_size) * epochs
        lr_schedule = keras.optimizers.schedules.CosineDecay(
            initial_learning_rate=1e-3,
            decay_steps=total_steps,
            alpha=1e-6 / 1e-3,
        )
        model.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=lr_schedule),
            loss=keras.losses.BinaryCrossentropy(from_logits=True),
            metrics=["accuracy"],
        )

        # Early stopping with min_delta to prevent premature stop
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=12, min_delta=0.001,
                restore_best_weights=True, verbose=1
            ),
        ]

        # 4. Build tf.data.Dataset for efficient training
        n_samples = len(labels)
        train_size = int(n_samples * (1 - validation_split))

        # Shuffle consistently
        indices = np.random.permutation(n_samples)
        train_idx, val_idx = indices[:train_size], indices[train_size:]

        def _make_dataset(idx_arr, shuffle=False):
            ds_features = {k: features[k][idx_arr] for k in features}
            ds_labels = labels[idx_arr]
            ds_weights = balanced_weights[idx_arr]
            ds = tf.data.Dataset.from_tensor_slices((ds_features, ds_labels, ds_weights))
            if shuffle:
                ds = ds.shuffle(buffer_size=min(len(idx_arr), 100_000))
            return ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)

        train_ds = _make_dataset(train_idx, shuffle=True)
        val_ds = _make_dataset(val_idx, shuffle=False)

        # 5. Train with tf.data
        history = model.model.fit(
            train_ds,
            epochs=epochs, verbose=1,
            validation_data=val_ds,
            callbacks=callbacks,
        )

        os.makedirs(output_dir, exist_ok=True)

        # 6. Evaluate baseline
        baseline_metrics = self.evaluate(model, user_profiles, items, user_metadata)
        logger.info(f"Baseline evaluation: {baseline_metrics}")

        # 7. Iterative Hard Negative Mining (3 rounds)
        ROUND_CONFIG = [
            # (n_global, n_intra, lr, epochs, weight)
            (4, 4, 2e-4, 15, 1.5),   # Round 1: balanced exploration
            (3, 5, 1e-4, 10, 2.0),   # Round 2: lean into intra-major
            (2, 6, 5e-5, 8,  2.5),   # Round 3: aggressive refinement
        ]
        for i, (n_g, n_i, lr, ft_ep, w) in enumerate(ROUND_CONFIG):
            logger.info(f"HNM Round {i+1}/3: global={n_g}, intra={n_i}, lr={lr:.0e}")
            self.fine_tune(
                model, user_profiles, items, user_metadata,
                epochs=ft_ep, batch_size=batch_size,
                n_hard_global=n_g, n_hard_intra=n_i,
                learning_rate=lr, hard_neg_weight=w,
            )

        # 8. Evaluate after fine-tuning
        final_metrics = self.evaluate(model, user_profiles, items, user_metadata)
        logger.info(f"Post-fine-tune evaluation: {final_metrics}")

        # 9. Quality gate
        if final_metrics["hitrate@50"] < MIN_HITRATE:
            logger.warning(
                f"Model REJECTED: HitRate@50={final_metrics['hitrate@50']:.4f} < {MIN_HITRATE}. "
                f"Keeping previous model."
            )
            return {
                "status": "rejected",
                "reason": "quality_gate",
                "threshold": MIN_HITRATE,
                "eval_baseline": baseline_metrics,
                "eval_final": final_metrics,
            }

        # 10. Save model + vocab + model_config
        model.save(output_dir)
        self.encoder.save(os.path.join(output_dir, "vocab.json"))

        model_config = {
            "model_type": "two_tower",
            "embedding_dim": 64,
            "temperature": 15.0,
            "vocab_sizes": vocab_sizes,
            "type_map": TYPE_MAP,
            "user_features": {
                "user_id":       {"dtype": "int32", "vocab_field": "user_id"},
                "user_major_id": {"dtype": "int32", "vocab_field": "major_id"},
                "user_course_id":{"dtype": "int32", "vocab_field": "course_id"},
                "user_semester":  {"dtype": "float32", "vocab_field": None},
                "user_career_id": {"dtype": "int32", "vocab_field": "career_id"},
            },
            "item_features": {
                "item_id":       {"dtype": "int32", "vocab_field": "item_id"},
                "item_type":     {"dtype": "int32", "vocab_field": None, "mapping": "type_map"},
                "item_major_id": {"dtype": "int32", "vocab_field": "major_id"},
                "item_course_id":{"dtype": "int32", "vocab_field": "course_id"},
                "item_semester":  {"dtype": "float32", "vocab_field": None},
            },
            "normalization": "L2 (UnitNormalization on tower output)",
            "similarity": "cosine (dot product of L2-normalized vectors)",
        }
        with open(os.path.join(output_dir, "model_config.json"), "w") as f:
            json.dump(model_config, f, indent=2)

        # 11. Build FAISS index
        courses = {doc["courseId"]: doc for doc in self._db.catalog_courses.find({})}
        self._build_faiss_index(model, items, courses, output_dir)

        # 12. Save metrics
        metrics = {
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_pairs": len(labels),
            "positive_pairs": int(labels.sum()),
            "epochs": epochs,
            "fine_tune_rounds": len(ROUND_CONFIG),
            "final_loss": float(history.history["loss"][-1]),
            "final_accuracy": float(history.history["accuracy"][-1]),
            "val_loss": float(history.history.get("val_loss", [0])[-1]),
            "val_accuracy": float(history.history.get("val_accuracy", [0])[-1]),
            "vocab_sizes": vocab_sizes,
            "output_dir": output_dir,
            "fine_tuned": True,
            "eval_baseline": baseline_metrics,
            "eval_final": final_metrics,
        }

        with open(os.path.join(output_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f, indent=2)

        logger.info(f"Training complete! Metrics: {json.dumps(metrics, indent=2)}")
        return metrics

    def close(self):
        self._client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Two-Tower recommendation model")
    parser.add_argument("--epochs", type=int, default=10, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=256, help="Batch size")
    parser.add_argument("--output", type=str, default=None, help="Output directory")
    args = parser.parse_args()

    trainer = Trainer()
    try:
        result = trainer.train(
            epochs=args.epochs,
            batch_size=args.batch_size,
            output_dir=args.output,
        )
        print(f"\nResult: {result['status']}")
    finally:
        trainer.close()
