"""Aggregated item popularity stats stored in recommendation_db."""

from pymongo import MongoClient
from datetime import datetime, timezone
from config import MONGO_URI, MONGO_DB_NAME


class ItemPopularityStore:
    """Aggregated item popularity statistics stored in ``recommendation_db``.

    Maintains per-item counters (views, likes, purchases, ratings) and a
    ``trendingScore`` field used for the trending endpoint.  Updated
    incrementally via interaction events from RabbitMQ.
    """
    def __init__(self):
        self._client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=10_000,
            connectTimeoutMS=10_000,
            socketTimeoutMS=30_000,
        )
        self._db = self._client.get_database(MONGO_DB_NAME)
        self._col = self._db.item_popularity
        self._indexes_ensured = False

    def _ensure_indexes(self):
        """Create indexes lazily on first write — avoids blocking module init."""
        if self._indexes_ensured:
            return
        try:
            self._col.create_index("itemId", unique=True)
            self._col.create_index([("majorId", 1), ("trendingScore", -1)])
            self._indexes_ensured = True
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Index creation failed (non-fatal): {e}")

    def update_on_interaction(self, event: dict) -> None:
        """Increment item counters based on interaction type."""
        self._ensure_indexes()
        item_id = event["itemId"]
        action = event.get("action", "")
        metadata = event.get("metadata", {})

        inc_fields: dict = {}
        set_fields: dict = {"lastUpdated": datetime.now(timezone.utc)}

        action_to_field = {
            "VIEW_PREVIEW": "stats.viewCount",
            "LIKE": "stats.likeCount",
            "COMMENT": "stats.commentCount",
            "DOWNLOAD": "stats.downloadCount",
            "PURCHASE": "stats.purchaseCount",
        }

        if action in action_to_field:
            inc_fields[action_to_field[action]] = 1
        elif action == "UNLIKE":
            inc_fields["stats.likeCount"] = -1
        elif action == "RATING":
            rating = metadata.get("ratingValue", 3)
            inc_fields["stats.ratingSum"] = rating
            inc_fields["stats.ratingCount"] = 1

        update: dict = {"$set": set_fields}
        if inc_fields:
            update["$inc"] = inc_fields

        # Upsert with item metadata
        self._col.update_one(
            {"itemId": item_id},
            {
                **update,
                "$setOnInsert": {
                    "itemType": event.get("itemType", ""),
                    "majorId": metadata.get("majorId", ""),
                    "courseId": metadata.get("courseId", ""),
                    "semester": metadata.get("semester", 0),
                    "trendingScore": 0.0,
                },
            },
            upsert=True,
        )

    def get_popular_items(
        self, major_id: str | None = None, limit: int = 50
    ) -> list[dict]:
        """Get items ranked by popularity score."""
        query: dict = {}
        if major_id:
            query["majorId"] = major_id

        items = list(
            self._col.find(query)
            .sort("trendingScore", -1)
            .limit(limit)
        )

        for item in items:
            stats = item.get("stats", {})
            rating_count = stats.get("ratingCount", 0)
            rating_sum = stats.get("ratingSum", 0)
            item["avgRating"] = rating_sum / rating_count if rating_count > 0 else 0.0

        return items

    def get_item_stats(self, item_id: str) -> dict | None:
        """Fetch raw popularity stats for a single item.

        Args:
            item_id: Unique content item identifier.

        Returns:
            The MongoDB document, or ``None`` if no stats exist.
        """
        return self._col.find_one({"itemId": item_id})

    def get_item_stats_many(self, item_ids: list[str]) -> dict[str, dict]:
        """Fetch popularity stats for multiple items in one MongoDB query."""
        if not item_ids:
            return {}

        docs = self._col.find({"itemId": {"$in": item_ids}})
        return {doc["itemId"]: doc for doc in docs}

    def get_total_items(self) -> int:
        """Count the number of distinct items with recorded interactions."""
        return self._col.count_documents({})

    def close(self) -> None:
        """Close the underlying MongoDB connection."""
        self._client.close()
