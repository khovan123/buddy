"""
Seed realistic interaction data into recommendation_db using REAL catalog & user data.

Reads items from `catalog_items` and users from `catalog_user_profiles`
in recommendation_db (materialized views), then generates realistic
interaction patterns following the same bias logic as train_two_tower.py:
  - 70% same-major interactions (users interact with items in their major)
  - 30% cross-major exploration
  - Action distribution: VIEW 55%, LIKE 20%, DOWNLOAD 10%, PURCHASE 10%, RATING 5%

Usage:
    NODE_ENV=production python scripts/seed_interactions.py [--count 3000] [--dry-run]
"""

import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone

# ── Load .env.prod ──────────────────────────────────────────────────────────────
from dotenv import load_dotenv

_env_file = ".env.prod" if os.getenv("NODE_ENV") == "production" else ".env"
load_dotenv(_env_file)

from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/recommendation_db")
DB_NAME = "recommendation_db"

# Interaction action weights (must match InteractionTrackedEvent contract)
ACTIONS = ["VIEW_PREVIEW", "LIKE", "DOWNLOAD", "PURCHASE", "RATING"]
ACTION_WEIGHTS = [0.55, 0.20, 0.10, 0.10, 0.05]


def load_catalog(db):
    """Load items and users from the recommendation_db materialized views."""
    items = list(db.catalog_items.find({}, {"_id": 0}))
    users = list(db.catalog_user_profiles.find({}, {"_id": 0}))
    courses = list(db.catalog_courses.find({}, {"_id": 0}))
    majors = list(db.catalog_majors.find({}, {"_id": 0}))

    print(f"Loaded: {len(items)} items, {len(users)} users, {len(courses)} courses, {len(majors)} majors")

    if not items:
        print("ERROR: No items in catalog_items. Run content sync first.")
        sys.exit(1)
    if not users:
        print("ERROR: No users in catalog_user_profiles. Run user sync first.")
        sys.exit(1)

    return items, users, courses


def generate_interactions(items, users, target_count=3000):
    """
    Generate realistic interaction data with same-major bias.
    
    Same logic as train_two_tower.py:
    - 70% of a user's interactions are with items from their own major
    - 30% are cross-major exploration
    - Each user gets 8-40 interactions
    """
    # Index items by major
    items_by_major = {}
    for item in items:
        major = item.get("majorId", "")
        items_by_major.setdefault(major, []).append(item)

    all_item_ids = [it["itemId"] for it in items]
    interactions = []

    # Time range: spread interactions over the last 90 days
    now = datetime.now(timezone.utc)
    time_range_days = 90

    # Calculate interactions per user to reach target
    interactions_per_user = max(8, min(40, target_count // len(users)))

    for user in users:
        user_major = user.get("majorId", "")
        same_major_items = items_by_major.get(user_major, [])
        other_items = [it for it in items if it.get("majorId", "") != user_major]

        n = random.randint(
            max(5, interactions_per_user - 5),
            min(50, interactions_per_user + 10),
        )

        # 70% same-major, 30% cross-major
        n_same = min(int(n * 0.7), len(same_major_items))
        n_other = min(n - n_same, len(other_items))

        chosen_items = []
        if same_major_items and n_same > 0:
            chosen_items += random.sample(same_major_items, n_same)
        if other_items and n_other > 0:
            chosen_items += random.sample(other_items, n_other)

        # Track which items this user has already viewed (for PURCHASE/DOWNLOAD realism)
        viewed_items = set()

        for item in chosen_items:
            action = random.choices(ACTIONS, weights=ACTION_WEIGHTS, k=1)[0]

            # Realism: can't PURCHASE/DOWNLOAD without viewing first
            if action in ("PURCHASE", "DOWNLOAD") and item["itemId"] not in viewed_items:
                # Add an implicit VIEW first
                view_time = now - timedelta(
                    days=random.randint(1, time_range_days),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                )
                interactions.append(_make_interaction(user, item, "VIEW_PREVIEW", view_time))
                viewed_items.add(item["itemId"])

            interaction_time = now - timedelta(
                days=random.randint(0, time_range_days),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )

            interaction = _make_interaction(user, item, action, interaction_time)
            interactions.append(interaction)
            viewed_items.add(item["itemId"])

    random.shuffle(interactions)

    # Trim to target count if we overshot
    if len(interactions) > target_count:
        interactions = interactions[:target_count]

    return interactions


def _make_interaction(user, item, action, timestamp):
    """Build a single interaction document matching UserProfileStore.update_on_interaction format."""
    interaction = {
        "userId": user["userId"],
        "itemId": item["itemId"],
        "itemType": item.get("itemType", "RESOURCE"),
        "action": action,
        "weight": _action_weight(action),
        "metadata": {
            "majorId": item.get("majorId", ""),
            "courseId": item.get("courseId", ""),
            "semester": item.get("semester", 0),
        },
        "timestamp": timestamp,
    }

    # Add rating value for RATING actions
    if action == "RATING":
        interaction["metadata"]["ratingValue"] = random.choices(
            [1, 2, 3, 4, 5], weights=[0.05, 0.10, 0.20, 0.35, 0.30], k=1
        )[0]

    return interaction


def _action_weight(action):
    """Return scoring weight by action type (matches recommendation engine weights)."""
    return {
        "VIEW_PREVIEW": 1.0,
        "LIKE": 2.0,
        "DOWNLOAD": 3.0,
        "PURCHASE": 5.0,
        "RATING": 2.5,
    }.get(action, 1.0)


def write_to_stores(db, interactions, dry_run=False):
    """
    Write interactions into the 3 recommendation_db stores:
    1. user_interaction_profiles — aggregated per-user
    2. item_popularity — aggregated per-item
    3. raw_interactions — raw log (for training data extraction)
    """
    if dry_run:
        print(f"\n[DRY RUN] Would write {len(interactions)} interactions")
        _print_stats(interactions)
        return

    from stores.user_profile_store import UserProfileStore
    from stores.item_popularity_store import ItemPopularityStore

    user_store = UserProfileStore()
    popularity_store = ItemPopularityStore()

    # Also write raw interactions for training data extraction
    raw_col = db.raw_interactions
    raw_col.create_index([("userId", 1), ("itemId", 1)])
    raw_col.create_index("timestamp")

    print(f"\nWriting {len(interactions)} interactions to recommendation_db...")

    batch = []
    for i, interaction in enumerate(interactions):
        # Update aggregated stores
        user_store.update_on_interaction(interaction)
        popularity_store.update_on_interaction(interaction)

        # Accumulate raw interactions for batch insert
        batch.append({
            "userId": interaction["userId"],
            "itemId": interaction["itemId"],
            "itemType": interaction["itemType"],
            "action": interaction["action"],
            "weight": interaction["weight"],
            "metadata": interaction["metadata"],
            "timestamp": interaction["timestamp"],
        })

        if len(batch) >= 500:
            raw_col.insert_many(batch)
            batch = []
            print(f"  Progress: {i+1}/{len(interactions)}")

    if batch:
        raw_col.insert_many(batch)

    user_store.close()
    popularity_store.close()

    print(f"  ✓ Wrote {len(interactions)} raw interactions")
    print(f"  ✓ Updated user_interaction_profiles")
    print(f"  ✓ Updated item_popularity")

    _print_stats(interactions)


def _print_stats(interactions):
    """Print summary statistics."""
    users = set(i["userId"] for i in interactions)
    items = set(i["itemId"] for i in interactions)
    actions = {}
    for i in interactions:
        actions[i["action"]] = actions.get(i["action"], 0) + 1

    print(f"\n── Summary ──")
    print(f"  Total interactions: {len(interactions)}")
    print(f"  Unique users:      {len(users)}")
    print(f"  Unique items:      {len(items)}")
    print(f"  Avg per user:      {len(interactions)/len(users):.1f}")
    print(f"  Action breakdown:")
    for action, count in sorted(actions.items(), key=lambda x: -x[1]):
        print(f"    {action:15s}: {count:5d} ({count/len(interactions)*100:.1f}%)")


def main():
    parser = argparse.ArgumentParser(description="Seed interaction data into recommendation_db")
    parser.add_argument("--count", type=int, default=3000, help="Target number of interactions (default: 3000)")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without writing")
    parser.add_argument("--clear", action="store_true", help="Clear existing interaction data before seeding")
    args = parser.parse_args()

    print(f"Connecting to MongoDB: {MONGO_URI[:40]}...")
    client = MongoClient(MONGO_URI)
    db = client.get_database(DB_NAME)

    if args.clear:
        print("Clearing existing interaction data...")
        db.user_interaction_profiles.delete_many({})
        db.item_popularity.delete_many({})
        db.raw_interactions.delete_many({})
        print("  ✓ Cleared user_interaction_profiles, item_popularity, raw_interactions")

    items, users, courses = load_catalog(db)
    interactions = generate_interactions(items, users, target_count=args.count)
    write_to_stores(db, interactions, dry_run=args.dry_run)

    client.close()
    print("\nDone!")


if __name__ == "__main__":
    # Add src/ to path so we can import stores
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
    main()
