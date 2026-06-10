"""
Materialized view store — local copies of content and user data in recommendation_db.

Instead of directly connecting to content_db or user_db (violating microservices
data ownership), this service maintains its OWN copies of the data it needs,
populated through domain events via RabbitMQ:

  content-service  ──[ContentPublished event]──▶  RabbitMQ  ──▶  consumer.py  ──▶  catalog_store
  user-service     ──[UserProfileUpdated event]──▶ RabbitMQ  ──▶  consumer.py  ──▶  catalog_store

This is the "Materialized View" / "CQRS read model" pattern used by YouTube, Netflix, etc.
"""

from pymongo import MongoClient
from datetime import datetime, timezone
from config import MONGO_URI, MONGO_DB_NAME


class CatalogStore:
    """Local materialized view of content items, courses, majors, and user profiles."""

    def __init__(self):
        """Connect to MongoDB and initialise collection references (indexes deferred)."""
        self._client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=10_000,
            connectTimeoutMS=10_000,
            socketTimeoutMS=30_000,
        )
        self._db = self._client.get_database(MONGO_DB_NAME)

        # Collections in recommendation_db (our own data)
        self._items = self._db.catalog_items
        self._courses = self._db.catalog_courses
        self._majors = self._db.catalog_majors
        self._user_profiles = self._db.catalog_user_profiles
        self._indexes_ensured = False

    def _ensure_indexes(self):
        """Create indexes lazily on first write — avoids blocking module init."""
        if self._indexes_ensured:
            return
        try:
            self._items.create_index("itemId", unique=True)
            self._items.create_index([("majorId", 1), ("courseId", 1)])
            self._items.create_index("courseId")
            self._items.create_index("itemType")
            self._courses.create_index("courseId", unique=True)
            self._majors.create_index("majorId", unique=True)
            self._user_profiles.create_index("userId", unique=True)
            self._indexes_ensured = True
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Index creation failed (non-fatal): {e}")

    # ─── Content Catalog (populated by content events) ──────────────────

    def upsert_item(self, item: dict) -> None:
        """Insert or update a content item in the local catalog."""
        self._ensure_indexes()
        self._items.update_one(
            {"itemId": item["itemId"]},
            {"$set": {
                "itemId": item["itemId"],
                "itemType": item.get("itemType", ""),
                "majorId": item.get("majorId", ""),
                "courseId": item.get("courseId", ""),
                "title": item.get("title", ""),
                "slug": item.get("slug", ""),
                "summary": item.get("summary", ""),
                "description": item.get("description", ""),
                "hightlights": item.get("hightlights") or [],
                "steps": item.get("steps") or [],
                "status": item.get("status", "AVAILABLE"),
                "createdAt": item.get("createdAt", datetime.now(timezone.utc)),
                "lastSynced": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    def remove_item(self, item_id: str) -> None:
        """Remove a content item from the local catalog (on delete event)."""
        self._items.delete_one({"itemId": item_id})

    def get_all_items(self) -> list[dict]:
        """Get all content items from the local catalog."""
        return list(self._items.find({}, {"_id": 0}))

    def get_item(self, item_id: str) -> dict | None:
        """Get a single content item by its itemId."""
        return self._items.find_one({"itemId": item_id}, {"_id": 0})

    def get_items_by_ids(self, item_ids: list[str]) -> dict[str, dict]:
        """Get multiple catalog items keyed by itemId in one MongoDB query."""
        if not item_ids:
            return {}

        docs = self._items.find({"itemId": {"$in": item_ids}}, {"_id": 0})
        return {doc["itemId"]: doc for doc in docs}

    def get_item_count(self) -> int:
        """Get the total number of items in the catalog."""
        return self._items.count_documents({})

    def get_items_by_major(self, major_id: str) -> list[dict]:
        """Get content items filtered by major."""
        return list(self._items.find({"majorId": major_id}, {"_id": 0}))

    def get_items_by_course(self, course_id: str) -> list[dict]:
        """Get content items filtered by course."""
        return list(self._items.find({"courseId": course_id}, {"_id": 0}))

    # ─── Course Catalog (populated by content events) ───────────────────

    def upsert_course(self, course: dict) -> None:
        """Insert or update a course in the local catalog."""
        self._ensure_indexes()
        self._courses.update_one(
            {"courseId": course["courseId"]},
            {"$set": {
                "courseId": course["courseId"],
                "majorId": course.get("majorId", ""),
                "semester": course.get("semester", 0),
                "code": course.get("code", ""),
                "name": course.get("name", ""),
                "lastSynced": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    def remove_course(self, course_id: str) -> None:
        """Remove a course from the local catalog.

        Args:
            course_id: Unique course identifier.
        """
        self._courses.delete_one({"courseId": course_id})

    def get_courses(self) -> dict[str, dict]:
        """Get all courses keyed by courseId."""
        courses = {}
        for doc in self._courses.find({}, {"_id": 0}):
            courses[doc["courseId"]] = doc
        return courses

    def get_course(self, course_id: str) -> dict | None:
        """Get a single course by its courseId."""
        return self._courses.find_one({"courseId": course_id}, {"_id": 0})

    # ─── Major Catalog (populated by content events) ────────────────────

    def upsert_major(self, major: dict) -> None:
        """Insert or update a major in the local catalog."""
        self._ensure_indexes()
        self._majors.update_one(
            {"majorId": major["majorId"]},
            {"$set": {
                "majorId": major["majorId"],
                "code": major.get("code", ""),
                "name": major.get("name", ""),
                "lastSynced": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    def get_majors(self) -> dict[str, dict]:
        """Get all majors keyed by ``majorId``.

        Returns:
            Dictionary mapping major IDs to their full documents.
        """
        majors = {}
        for doc in self._majors.find({}, {"_id": 0}):
            majors[doc["majorId"]] = doc
        return majors

    def get_major(self, major_id: str) -> dict | None:
        """Get a single major by its majorId."""
        return self._majors.find_one({"majorId": major_id}, {"_id": 0})

    def get_all_majors(self) -> list[dict]:
        """Get all majors as a list."""
        return list(self._majors.find({}, {"_id": 0}))

    def remove_major(self, major_id: str) -> None:
        """Remove a major from the local catalog (on delete event)."""
        self._majors.delete_one({"majorId": major_id})

    # ─── User Profiles (populated by user events) ──────────────────────

    def upsert_user_profile(self, profile: dict) -> None:
        """Insert or update a user profile in the local catalog."""
        self._ensure_indexes()
        self._user_profiles.update_one(
            {"userId": profile["userId"]},
            {"$set": {
                "userId": profile["userId"],
                "majorId": profile.get("majorId", ""),
                "courseId": profile.get("courseId", ""),
                "semester": profile.get("semester", 0),
                "careerId": profile.get("careerId", ""),
                "skillIds": profile.get("skillIds", []),
                "lastSynced": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    def get_user_profile(self, user_id: str) -> dict | None:
        """Get a user profile from the local catalog."""
        doc = self._user_profiles.find_one({"userId": user_id}, {"_id": 0})
        return doc

    # ─── Lifecycle ──────────────────────────────────────────────────────

    def close(self) -> None:
        """Close the underlying MongoDB connection."""
        self._client.close()
        
    def ping(self) -> dict:
        """Ping MongoDB to verify readiness."""
        return self._db.command("ping")
