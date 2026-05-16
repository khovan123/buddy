"""Aggregated user interaction profiles stored in recommendation_db."""

from pymongo import MongoClient, ReturnDocument
from datetime import datetime, timezone
from config import MONGO_URI, MONGO_DB_NAME, HISTORY_SIZE


class UserProfileStore:
    """Aggregated user interaction profiles stored in ``recommendation_db``.

    Each document tracks a user's interaction history, major/course affinities,
    and purchased item IDs.  Updated incrementally on every interaction event
    consumed from RabbitMQ.
    """
    def __init__(self):
        self._client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=10_000,
            connectTimeoutMS=10_000,
            socketTimeoutMS=30_000,
        )
        self._db = self._client.get_database(MONGO_DB_NAME)
        self._col = self._db.user_interaction_profiles
        self._indexes_ensured = False

    def _ensure_indexes(self):
        """Create indexes lazily on first write — avoids blocking module init."""
        if self._indexes_ensured:
            return
        try:
            self._col.create_index("userId", unique=True)
            self._indexes_ensured = True
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Index creation failed (non-fatal): {e}")

    def get(self, user_id: str) -> dict | None:
        """Retrieve the interaction profile for a user.

        Args:
            user_id: Unique user identifier.

        Returns:
            The raw MongoDB document, or ``None`` if the user has no
            interaction history.
        """
        return self._col.find_one({"userId": user_id})

    def update_on_interaction(self, event: dict) -> None:
        """Incrementally update user profile on each interaction event."""
        self._ensure_indexes()
        user_id = event["userId"]
        weight = event.get("weight", 1.0)
        major_id = event.get("metadata", {}).get("majorId", "")
        course_id = event.get("metadata", {}).get("courseId", "")
        action = event.get("action", "")

        # Build atomic update
        update = {
            "$inc": {"totalInteractions": 1},
            "$set": {"lastUpdated": datetime.now(timezone.utc)},
            "$push": {
                "recentItems": {
                    "$each": [{
                        "itemId": event["itemId"],
                        "itemType": event.get("itemType", ""),
                        "action": action,
                        "weight": weight,
                        "at": datetime.now(timezone.utc),
                    }],
                    "$slice": -HISTORY_SIZE,  # keep last N
                }
            },
        }

        # Track major affinities
        if major_id:
            update["$inc"][f"majorAffinities.{major_id}"] = weight

        # Track course affinities
        if course_id:
            update["$inc"][f"courseAffinities.{course_id}"] = weight

        # Track purchased items for exclusion
        if action == "PURCHASE":
            update.setdefault("$addToSet", {})["purchasedItemIds"] = event["itemId"]

        self._col.update_one(
            {"userId": user_id},
            update,
            upsert=True,
        )

    def get_interaction_count(self, user_id: str) -> int:
        """Return the total interaction count for a single user.

        Args:
            user_id: Unique user identifier.

        Returns:
            Non-negative integer; 0 if the user has no profile.
        """
        doc = self._col.find_one({"userId": user_id}, {"totalInteractions": 1})
        return doc.get("totalInteractions", 0) if doc else 0

    def get_total_users_with_interactions(self) -> int:
        """Count distinct users that have at least one recorded interaction."""
        return self._col.count_documents({})

    def get_total_interactions(self) -> int:
        """Sum ``totalInteractions`` across all user profiles.

        Uses a MongoDB aggregation pipeline.  Returns 0 when the
        collection is empty.
        """
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$totalInteractions"}}}]
        result = list(self._col.aggregate(pipeline))
        return result[0]["total"] if result else 0

    def close(self) -> None:
        """Close the underlying MongoDB connection."""
        self._client.close()
