"""Layer 1: Behavioral scoring — interaction-weighted collaborative filtering."""

import math
from datetime import datetime, timezone
from config import TIME_DECAY_LAMBDA


def _item_similarity(interacted: dict, candidate: dict) -> float:
    """Feature-level similarity between two items."""
    sim = 0.0
    if interacted.get("majorId") and interacted["majorId"] == candidate.get("majorId"):
        sim += 1.0
    if interacted.get("courseId") and interacted["courseId"] == candidate.get("courseId"):
        sim += 0.8
    if interacted.get("semester") and interacted["semester"] == candidate.get("semester"):
        sim += 0.5
    return sim


def score_behavioral(
    user_profile: dict,
    candidate: dict,
    courses: dict[str, dict],
) -> tuple[float, list[str]]:
    """
    Score a candidate based on user's interaction history.
    Uses time-decayed weighted interaction signals.
    Returns (score, reasons).
    """
    recent_items = user_profile.get("recentItems", [])
    if not recent_items:
        return 0.0, []

    score = 0.0
    similar_count = 0
    now = datetime.now(timezone.utc)

    # Resolve candidate semester from course metadata
    c_course = candidate.get("courseId", "")
    c_semester = 0
    if c_course and c_course in courses:
        c_semester = courses[c_course].get("semester", 0)

    candidate_features = {
        "majorId": candidate.get("majorId", ""),
        "courseId": c_course,
        "semester": c_semester,
    }

    for interaction in recent_items:
        weight = interaction.get("weight", 1.0)

        # Time decay
        interaction_time = interaction.get("at")
        if isinstance(interaction_time, datetime):
            days_since = max(0, (now - interaction_time.replace(tzinfo=timezone.utc)).days)
        else:
            days_since = 30  # fallback

        decay = math.exp(-TIME_DECAY_LAMBDA * days_since)

        # Resolve interacted item's semester
        i_course = interaction.get("courseId", "")
        i_semester = 0
        if i_course and i_course in courses:
            i_semester = courses[i_course].get("semester", 0)

        interacted_features = {
            "majorId": interaction.get("majorId", ""),
            "courseId": i_course,
            "semester": i_semester,
        }

        sim = _item_similarity(interacted_features, candidate_features)
        if sim > 0:
            score += weight * decay * sim
            similar_count += 1

    reasons = []
    if similar_count > 0:
        reasons.append(f"Similar to {similar_count} items you interacted with")

    return score, reasons
