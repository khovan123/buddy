"""Scoring engine — orchestrates rule-based layers + ML retrieval layer."""

import time
import logging
from config import (
    BLENDING_WEIGHTS,
    MIN_INTERACTIONS_FULL,
    PHASE_ONLINE_THRESHOLD,
    PHASE_BATCH_ML_THRESHOLD,
    PHASE_CONTINUOUS_THRESHOLD,
    TOP_K_CANDIDATES,
    MODEL_LOAD_ON_STARTUP,
)
from scoring.behavioral import score_behavioral
from scoring.profile_based import score_profile
from scoring.popularity import score_popularity
from stores.user_profile_store import UserProfileStore
from stores.item_popularity_store import ItemPopularityStore
from stores.catalog_store import CatalogStore
from ml.model_manager import ModelManager

logger = logging.getLogger(__name__)


class ScoringEngine:
    """Orchestrates rule-based scoring layers and ML retrieval for recommendations.

    Scoring layers (applied with tier-dependent blending weights):
        1. **Behavioral** — time-decayed interaction similarity.
        2. **Profile-based** — major / course / semester matching.
        3. **Popularity** — log-scaled global popularity + trending.

    When a trained Two-Tower model is available, an additional FAISS ANN
    retrieval path is used for users in the ``full`` or ``partial`` tier.

    Args:
        user_store: Aggregated user interaction profiles.
        popularity_store: Item-level popularity statistics.
        catalog_store: Local materialized view of content items.
    """

    def __init__(
        self,
        user_store: UserProfileStore,
        popularity_store: ItemPopularityStore,
        catalog_store: CatalogStore,
    ):
        self.user_store = user_store
        self.popularity_store = popularity_store
        self.catalog_store = catalog_store

        # ML model (lazy-loaded when trained model exists)
        self.model_manager = ModelManager()
        self._model_load_attempted = False
        if MODEL_LOAD_ON_STARTUP:
            self._try_load_model()
        else:
            logger.info("ML model startup preload disabled — using lazy/rule-based scoring")

    def _try_load_model(self) -> None:
        """Attempt to load the latest trained model. Non-blocking."""
        self._model_load_attempted = True
        try:
            loaded = self.model_manager.load()
            if loaded:
                logger.info(f"ML model active: {self.model_manager.active_version}")
            else:
                logger.info("No trained ML model found — using rule-based scoring")
        except Exception as e:
            logger.warning(f"Failed to load ML model: {e}")

    def _ensure_model_loaded(self) -> None:
        """Lazy-load the ML model once before an ML-eligible recommendation path."""
        if self.model_manager.is_loaded or self._model_load_attempted:
            return

        self._try_load_model()

    def reload_model(self) -> bool:
        """Hot-reload the latest model version (called after training completes)."""
        return self.model_manager.load()

    def detect_phase(self) -> str:
        """Auto-detect system evolution phase based on total interactions."""
        total = self.user_store.get_total_interactions()
        if total >= PHASE_CONTINUOUS_THRESHOLD:
            return "continuous"
        elif total >= PHASE_BATCH_ML_THRESHOLD:
            return "batch_ml"
        elif total >= PHASE_ONLINE_THRESHOLD:
            return "online"
        return "rules"

    def detect_user_tier(self, interaction_count: int, has_profile: bool) -> str:
        """Determine cold-start tier for blending weights."""
        if interaction_count >= MIN_INTERACTIONS_FULL:
            return "full"
        elif interaction_count > 0:
            return "partial"
        elif has_profile:
            return "profile_only"
        return "cold"

    def _recommend_ml(
        self,
        user_profile: dict,
        user_interaction_profile: dict | None,
        content_type: str | None,
        limit: int,
    ) -> list[dict]:
        """
        ML retrieval path: FAISS ANN → re-rank with popularity.

        Flow:
          1. User embedding (real-time) → FAISS search → top-100 candidates
          2. Re-rank: 0.7 * ANN_score + 0.3 * popularity
          3. Filter purchased items
          4. Return top-K
        """
        t0 = time.time()

        # 1. FAISS retrieval
        candidates = self.model_manager.retrieve_similar(
            user_profile, top_k=TOP_K_CANDIDATES
        )

        if candidates is None:
            # Fallback: brute-force if FAISS unavailable
            return self._recommend_ml_bruteforce(
                user_profile, user_interaction_profile, content_type, limit
            )

        # 2. Filter by content type
        if content_type:
            catalog_items = {
                it["itemId"]: it for it in self.catalog_store.get_all_items()
                if it["itemType"] == content_type
            }
            candidates = [c for c in candidates if c["itemId"] in catalog_items]
        else:
            candidate_ids = [c["itemId"] for c in candidates]
            catalog_items = self.catalog_store.get_items_by_ids(candidate_ids)

        candidate_ids = [c["itemId"] for c in candidates]
        popularity_by_item = self.popularity_store.get_item_stats_many(candidate_ids)

        # 3. Exclude purchased
        purchased = set()
        if user_interaction_profile:
            purchased = set(user_interaction_profile.get("purchasedItemIds", []))

        # 4. Re-rank with popularity blending
        scored = []
        for cand in candidates:
            item_id = cand["itemId"]
            if item_id in purchased:
                continue

            ann_score = cand["score"]  # cosine similarity from FAISS

            # Popularity component
            item_stats = popularity_by_item.get(item_id)
            pp_score, pp_reasons = score_popularity(item_stats)

            # Blend: 70% ML + 30% popularity
            total_score = 0.7 * ann_score * 10.0 + 0.3 * pp_score

            reasons = []
            if ann_score > 0.5:
                reasons.append("ML model match")
            reasons.extend(pp_reasons)

            scored.append({
                "itemId": item_id,
                "itemType": catalog_items.get(item_id, {}).get("itemType", "RESOURCE"),
                "score": round(total_score, 4),
                "reasons": reasons[:5],
            })

        scored.sort(key=lambda x: x["score"], reverse=True)

        retrieval_ms = round((time.time() - t0) * 1000, 1)
        logger.info(f"ML retrieval: {len(scored)} candidates in {retrieval_ms}ms")

        return scored[:limit]

    def _recommend_ml_bruteforce(
        self,
        user_profile: dict,
        user_interaction_profile: dict | None,
        content_type: str | None,
        limit: int,
    ) -> list[dict]:
        """Fallback brute-force scoring when FAISS index is unavailable."""
        candidates = self.catalog_store.get_all_items()
        if content_type:
            candidates = [c for c in candidates if c["itemType"] == content_type]

        # Filter by major
        u_major = user_profile.get("majorId", "")
        if u_major:
            same_major = [c for c in candidates if c.get("majorId") == u_major]
            other_major = [c for c in candidates if c.get("majorId") != u_major]
            candidates = same_major + other_major[:20]

        candidates = candidates[:TOP_K_CANDIDATES]

        purchased = set()
        if user_interaction_profile:
            purchased = set(user_interaction_profile.get("purchasedItemIds", []))

        popularity_by_item = self.popularity_store.get_item_stats_many(
            [candidate["itemId"] for candidate in candidates]
        )

        scored = []
        for candidate in candidates:
            if candidate["itemId"] in purchased:
                continue

            ml_score = self.model_manager.score_ml(user_profile, candidate)
            total_score = 0.7 * ml_score * 10.0

            item_stats = popularity_by_item.get(candidate["itemId"])
            pp_score, pp_reasons = score_popularity(item_stats)
            total_score += 0.3 * pp_score

            reasons = []
            if ml_score > 0.5:
                reasons.append("ML model match")
            reasons.extend(pp_reasons)

            scored.append({
                "itemId": candidate["itemId"],
                "itemType": candidate["itemType"],
                "score": round(total_score, 4),
                "reasons": reasons[:5],
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:limit]

    def _get_item_type(self, item_id: str) -> str:
        """Look up item type from catalog."""
        item = self.catalog_store.get_item(item_id)
        return item.get("itemType", "RESOURCE") if item else "RESOURCE"

    def recommend(
        self,
        user_id: str,
        limit: int = 10,
        content_type: str | None = None,
    ) -> dict:
        """
        Generate recommendations for a user.
        Uses FAISS-first ML retrieval when available (Phase 3+),
        otherwise pure rule-based.
        """
        # 1. Load user data from local catalog
        user_interaction_profile = self.user_store.get(user_id)
        user_profile = self.catalog_store.get_user_profile(user_id)
        courses = self.catalog_store.get_courses()

        interaction_count = 0
        if user_interaction_profile:
            interaction_count = user_interaction_profile.get("totalInteractions", 0)

        has_profile = bool(user_profile and user_profile.get("majorId"))
        tier = self.detect_user_tier(interaction_count, has_profile)
        phase = self.detect_phase()
        if tier in ("full", "partial"):
            self._ensure_model_loaded()
        use_ml = self.model_manager.is_loaded and tier in ("full", "partial")

        # 2. ML path: FAISS retrieval → popularity re-rank
        if use_ml and user_profile:
            recommendations = self._recommend_ml(
                user_profile, user_interaction_profile, content_type, limit
            )
            return {
                "userId": user_id,
                "strategy": "ml",
                "interactionCount": interaction_count,
                "phase": phase,
                "modelVersion": self.model_manager.active_version,
                "recommendations": recommendations,
            }

        # 3. Rule-based path (cold-start / no ML model)
        bw, pw, ppw = BLENDING_WEIGHTS[tier]

        candidates = self.catalog_store.get_all_items()
        if content_type:
            candidates = [c for c in candidates if c["itemType"] == content_type]

        # Filter by user's major for non-cold users
        if tier in ("full", "partial", "profile_only") and user_profile:
            u_major = user_profile.get("majorId", "")
            if u_major:
                same_major = [c for c in candidates if c.get("majorId") == u_major]
                other_major = [c for c in candidates if c.get("majorId") != u_major]
                candidates = same_major + other_major[:20]

        candidates = candidates[:TOP_K_CANDIDATES]

        # Exclude already purchased items
        purchased = set()
        if user_interaction_profile:
            purchased = set(user_interaction_profile.get("purchasedItemIds", []))

        popularity_by_item = self.popularity_store.get_item_stats_many(
            [candidate["itemId"] for candidate in candidates]
        )

        scored: list[dict] = []
        for candidate in candidates:
            if candidate["itemId"] in purchased:
                continue

            total_score = 0.0
            reasons: list[str] = []

            # Layer 1: Behavioral
            if bw > 0 and user_interaction_profile:
                b_score, b_reasons = score_behavioral(
                    user_interaction_profile, candidate, courses
                )
                total_score += bw * b_score
                reasons.extend(b_reasons)

            # Layer 2: Profile-based
            if pw > 0 and user_profile:
                p_score, p_reasons = score_profile(
                    user_profile, candidate, courses
                )
                total_score += pw * p_score
                reasons.extend(p_reasons)

            # Layer 3: Popularity
            if ppw > 0:
                item_stats = popularity_by_item.get(candidate["itemId"])
                pp_score, pp_reasons = score_popularity(item_stats)
                total_score += ppw * pp_score
                reasons.extend(pp_reasons)

            scored.append({
                "itemId": candidate["itemId"],
                "itemType": candidate["itemType"],
                "score": round(total_score, 4),
                "reasons": reasons[:5],
            })

        scored.sort(key=lambda x: x["score"], reverse=True)

        strategy = {
            "full": "behavioral",
            "partial": "behavioral",
            "profile_only": "profile",
            "cold": "popularity",
        }[tier]

        return {
            "userId": user_id,
            "strategy": strategy,
            "interactionCount": interaction_count,
            "phase": phase,
            "modelVersion": self.model_manager.active_version,
            "recommendations": scored[:limit],
        }
