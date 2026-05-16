"""Layer 2: Profile-based scoring — major > semester > course > career matching."""


from datetime import datetime, timezone


def score_profile(
    user_profile: dict,
    candidate: dict,
    courses: dict[str, dict],
) -> tuple[float, list[str]]:
    """
    Score a candidate item against the user's profile.
    Returns (score, reasons).
    """
    score = 0.0
    reasons: list[str] = []

    u_major = user_profile.get("majorId", "")
    u_course = user_profile.get("courseId", "")
    u_semester = user_profile.get("semester", 0)

    c_major = candidate.get("majorId", "")
    c_course = candidate.get("courseId", "")

    # Resolve item's semester from course metadata
    c_semester = 0
    if c_course and c_course in courses:
        c_semester = courses[c_course].get("semester", 0)

    # Major match (5.0)
    if u_major and c_major and u_major == c_major:
        score += 5.0
        reasons.append(f"Same major")

    # Course match (4.0)
    if u_course and c_course and u_course == c_course:
        score += 4.0
        reasons.append(f"Same course")

    # Semester proximity (3.0 for exact, 1.5 for ±1)
    if u_semester and c_semester:
        diff = abs(u_semester - c_semester)
        if diff == 0:
            score += 3.0
            reasons.append(f"Same semester ({u_semester})")
        elif diff == 1:
            score += 1.5
            reasons.append(f"Adjacent semester")

    # Recency boost (1.0 max, decays over 180 days)
    created_at = candidate.get("createdAt")
    if created_at:
        if isinstance(created_at, datetime):
            days_old = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
        else:
            days_old = 90  # fallback
        recency = max(0.0, 1.0 - (days_old / 180.0))
        score += recency

    return score, reasons
