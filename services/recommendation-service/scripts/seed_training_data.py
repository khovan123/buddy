"""
Seed recommendation_db with synthetic training data.

Generates realistic university content platform data:
  - 5 majors (SE, CS, DS, AI, CE)
  - 30 courses spread across majors and semesters
  - 150 items (RESOURCE / TUTORIAL / COLLECTION)
  - 60 users with profiles
  - ~800 interactions (views, likes, purchases)

Usage:
  python seed_training_data.py [--db-url mongodb://localhost:27018/recommendation_db]
"""

import argparse
import random
import hashlib
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient

# ─── Reproducible ───────────────────────────────────────────────────────────────
random.seed(42)


def make_id(prefix: str, idx: int) -> str:
    """Deterministic short ID."""
    return hashlib.md5(f"{prefix}_{idx}".encode()).hexdigest()[:24]


# ─── Domain Data ────────────────────────────────────────────────────────────────

MAJORS = [
    {"majorId": make_id("major", i), "code": code, "name": name}
    for i, (code, name) in enumerate([
        ("SE", "Software Engineering"),
        ("CS", "Computer Science"),
        ("DS", "Data Science"),
        ("AI", "Artificial Intelligence"),
        ("CE", "Computer Engineering"),
    ])
]

CAREER_GOALS = ["backend", "frontend", "fullstack", "data-engineer", "ml-engineer",
                "devops", "mobile", "security", "cloud-architect", "product-manager"]

ITEM_TYPES = ["RESOURCE", "TUTORIAL", "COLLECTION"]

RESOURCE_TITLES = [
    "Introduction to {}", "Advanced {}", "{} Fundamentals", "{} Best Practices",
    "{} Design Patterns", "{} Performance Guide", "{} Security Handbook",
    "Mastering {}", "{} Cheat Sheet", "{} Interview Prep",
]

TOPICS = [
    "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js",
    "Docker", "Kubernetes", "AWS", "Machine Learning", "Deep Learning",
    "SQL", "MongoDB", "Redis", "GraphQL", "REST APIs", "Microservices",
    "Git", "CI/CD", "System Design", "Data Structures", "Algorithms",
    "Operating Systems", "Networking", "Cryptography", "Cloud Computing",
    "DevOps", "Agile", "TDD", "Clean Code",
]


def generate_courses() -> list[dict]:
    courses = []
    for major in MAJORS:
        for semester in range(1, 7):  # 6 semesters per major
            courses.append({
                "courseId": make_id(f"course_{major['code']}", semester),
                "majorId": major["majorId"],
                "code": f"{major['code']}{semester}01",
                "name": f"{major['name']} - Semester {semester}",
                "semester": semester,
            })
    return courses


def generate_items(courses: list[dict]) -> list[dict]:
    items = []
    for i in range(150):
        course = random.choice(courses)
        topic = random.choice(TOPICS)
        title_template = random.choice(RESOURCE_TITLES)
        item_type = random.choice(ITEM_TYPES)

        items.append({
            "itemId": make_id("item", i),
            "itemType": item_type,
            "title": title_template.format(topic),
            "majorId": course["majorId"],
            "courseId": course["courseId"],
            "semester": course["semester"],
            "tags": random.sample(TOPICS, min(3, len(TOPICS))),
            "createdAt": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 180))).isoformat(),
        })
    return items


def generate_users(courses: list[dict]) -> list[dict]:
    users = []
    for i in range(60):
        major = random.choice(MAJORS)
        semester = random.randint(1, 6)
        major_courses = [c for c in courses if c["majorId"] == major["majorId"]]
        course = random.choice(major_courses) if major_courses else random.choice(courses)

        users.append({
            "userId": make_id("user", i),
            "majorId": major["majorId"],
            "courseId": course["courseId"],
            "semester": semester,
            "careerId": random.choice(CAREER_GOALS),
            "displayName": f"Student_{i:03d}",
        })
    return users


def generate_interactions(users: list[dict], items: list[dict]) -> list[dict]:
    """Generate realistic interaction patterns — users prefer items in their major."""
    interactions = []
    action_types = ["VIEW", "LIKE", "PURCHASE"]
    action_weights = [0.60, 0.25, 0.15]

    for user in users:
        # Users interact more with items in their own major
        same_major_items = [it for it in items if it["majorId"] == user["majorId"]]
        other_items = [it for it in items if it["majorId"] != user["majorId"]]

        n_interactions = random.randint(3, 25)
        n_same = int(n_interactions * 0.7)  # 70% from own major
        n_other = n_interactions - n_same

        chosen = (
            random.sample(same_major_items, min(n_same, len(same_major_items)))
            + random.sample(other_items, min(n_other, len(other_items)))
        )

        for item in chosen:
            action = random.choices(action_types, weights=action_weights, k=1)[0]
            interactions.append({
                "userId": user["userId"],
                "itemId": item["itemId"],
                "itemType": item["itemType"],
                "actionType": action,
                "timestamp": (datetime.now(timezone.utc) - timedelta(
                    days=random.randint(0, 60),
                    hours=random.randint(0, 23),
                )).isoformat(),
            })

    return interactions


def build_user_interaction_profiles(users: list[dict], interactions: list[dict]) -> list[dict]:
    """Aggregate interactions into per-user profile documents."""
    user_interactions: dict[str, list[dict]] = {}
    for inter in interactions:
        uid = inter["userId"]
        user_interactions.setdefault(uid, []).append(inter)

    profiles = []
    for user in users:
        uid = user["userId"]
        user_ints = user_interactions.get(uid, [])
        if not user_ints:
            continue

        purchased_ids = [i["itemId"] for i in user_ints if i["actionType"] == "PURCHASE"]

        profiles.append({
            "userId": uid,
            "totalInteractions": len(user_ints),
            "recentItems": [
                {
                    "itemId": i["itemId"],
                    "itemType": i["itemType"],
                    "actionType": i["actionType"],
                    "weight": {"VIEW": 1.0, "LIKE": 3.0, "PURCHASE": 5.0}[i["actionType"]],
                    "timestamp": i["timestamp"],
                }
                for i in sorted(user_ints, key=lambda x: x["timestamp"], reverse=True)[:100]
            ],
            "purchasedItemIds": purchased_ids,
        })
    return profiles


def build_item_popularity(items: list[dict], interactions: list[dict]) -> list[dict]:
    """Aggregate interaction counts per item."""
    stats: dict[str, dict] = {}
    for inter in interactions:
        iid = inter["itemId"]
        if iid not in stats:
            stats[iid] = {"viewCount": 0, "likeCount": 0, "purchaseCount": 0}
        action = inter["actionType"].lower() + "Count"
        stats[iid][action] = stats[iid].get(action, 0) + 1

    popularity = []
    for item in items:
        iid = item["itemId"]
        s = stats.get(iid, {"viewCount": 0, "likeCount": 0, "purchaseCount": 0})
        total = s["viewCount"] + s["likeCount"] * 2 + s["purchaseCount"] * 3
        popularity.append({
            "itemId": iid,
            "itemType": item["itemType"],
            "majorId": item.get("majorId", ""),
            "stats": s,
            "totalScore": total,
            "avgRating": round(random.uniform(3.0, 5.0), 1),
        })
    return popularity


def seed(db_url: str) -> None:
    client = MongoClient(db_url)
    db = client.get_database()

    # Generate all data
    courses = generate_courses()
    items = generate_items(courses)
    users = generate_users(courses)
    interactions = generate_interactions(users, items)
    user_profiles = build_user_interaction_profiles(users, interactions)
    item_popularity = build_item_popularity(items, interactions)

    # Clear and insert
    collections = {
        "catalog_courses": courses,
        "catalog_items": [
            {**it, "_id": it["itemId"]} for it in items
        ],
        "catalog_user_profiles": users,
        "user_interaction_profiles": user_profiles,
        "item_popularity": item_popularity,
    }

    for name, docs in collections.items():
        db[name].drop()
        if docs:
            db[name].insert_many(docs)
        print(f"  {name}: {len(docs)} documents")

    total_interactions = sum(p["totalInteractions"] for p in user_profiles)
    print(f"\n✅ Seeded recommendation_db:")
    print(f"   {len(MAJORS)} majors, {len(courses)} courses, {len(items)} items")
    print(f"   {len(users)} users, {len(user_profiles)} interaction profiles")
    print(f"   {total_interactions} total interactions")
    print(f"   {len(item_popularity)} item popularity records")

    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed recommendation_db with synthetic data")
    parser.add_argument("--db-url", default="mongodb://localhost:27018/recommendation_db",
                        help="MongoDB connection URL")
    args = parser.parse_args()

    print(f"Seeding {args.db_url} ...")
    seed(args.db_url)
