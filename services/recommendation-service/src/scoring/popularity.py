"""Layer 3: Popularity-based scoring — global popularity + trending."""

import math


def score_popularity(item_stats: dict | None) -> tuple[float, list[str]]:
    """
    Score a candidate item by its global popularity.
    Returns (score, reasons).
    """
    if not item_stats:
        return 0.0, []

    score = 0.0
    reasons: list[str] = []
    stats = item_stats.get("stats", {})

    views = stats.get("viewCount", 0)
    likes = stats.get("likeCount", 0)
    purchases = stats.get("purchaseCount", 0)
    downloads = stats.get("downloadCount", 0)
    rating_count = stats.get("ratingCount", 0)
    rating_sum = stats.get("ratingSum", 0)

    avg_rating = rating_sum / rating_count if rating_count > 0 else 0.0

    # Weighted log-scaled popularity
    view_score = math.log1p(views) * 0.3
    like_score = math.log1p(likes) * 0.5
    purchase_score = math.log1p(purchases) * 0.8
    download_score = math.log1p(downloads) * 0.6
    rating_score = avg_rating * 1.0

    score = view_score + like_score + purchase_score + download_score + rating_score

    # Trending boost
    trending = item_stats.get("trendingScore", 0.0)
    if trending > 0:
        score += trending * 1.5
        reasons.append("Trending")

    if purchases > 5:
        reasons.append(f"{purchases} purchases")
    if avg_rating >= 4.0:
        reasons.append(f"Rated {avg_rating:.1f}★")
    if likes > 10:
        reasons.append(f"{likes} likes")

    return score, reasons
