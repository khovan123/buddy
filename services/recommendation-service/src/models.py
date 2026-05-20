"""
Pydantic request/response models for the recommendation service API.

All models use camelCase field names to match the NestJS gateway conventions.
"""

from pydantic import BaseModel, Field
from typing import Optional


class RecommendRequest(BaseModel):
    """Inbound query parameters for the ``/recommend`` endpoint.

    Attributes:
        userId: Target user for personalisation.
        limit: Maximum items to return (1–50).
        contentType: Optional content type filter.
    """

    userId: str
    limit: int = Field(default=10, ge=1, le=50)
    contentType: Optional[str] = None  # RESOURCE | TUTORIAL | RESOURCE_COLLECTION | TUTORIAL_COLLECTION | None (all)

class RecommendationItem(BaseModel):
    """A single scored recommendation returned to the client.

    Attributes:
        itemId: Unique content item identifier.
        itemType: One of ``RESOURCE``, ``TUTORIAL``, etc.
        score: Blended relevance score (higher is better).
        reasons: Human-readable explanations for the ranking.
    """

    itemId: str
    itemType: str
    score: float
    reasons: list[str] = []
    display: Optional[dict] = None

class RecommendResponse(BaseModel):
    """Response envelope for the ``/recommend`` endpoint.

    Attributes:
        userId: The requesting user.
        strategy: Scoring strategy used (``ml``, ``behavioral``, ``profile``, ``popularity``).
        interactionCount: Total interactions recorded for this user.
        phase: System evolution phase (``rules``, ``online``, ``batch_ml``, ``continuous``).
        recommendations: Ordered list of scored items.
    """

    userId: str
    strategy: str
    interactionCount: int
    phase: str
    recommendations: list[RecommendationItem]

class TrendingRequest(BaseModel):
    """Inbound query parameters for the ``/trending`` endpoint.

    Attributes:
        majorId: Optional major scope.
        days: Trend window in days.
        limit: Maximum items to return.
    """

    majorId: Optional[str] = None
    days: int = Field(default=7, ge=1, le=30)
    limit: int = Field(default=10, ge=1, le=50)

class TrendingItem(BaseModel):
    """A single trending item with aggregate interaction stats.

    Attributes:
        itemId: Unique content item identifier.
        itemType: Content type.
        totalInteractions: Sum of views, likes, and purchases.
        avgRating: Average user rating (0.0 if unrated).
    """

    itemId: str
    itemType: str
    totalInteractions: int
    avgRating: float
    display: Optional[dict] = None

class TrendingResponse(BaseModel):
    """Response envelope for the ``/trending`` endpoint."""

    majorId: Optional[str]
    period: str
    items: list[TrendingItem]

class HealthResponse(BaseModel):
    """Response for the ``/v1/health`` full-check endpoint.

    Attributes:
        status: Always ``"healthy"``.
        phase: Current system evolution phase.
        totalInteractions: Aggregate interaction count across all users.
        totalUsers: Number of users with at least one interaction.
        totalItems: Number of items in the popularity store.
    """

    status: str
    phase: str
    totalInteractions: int
    totalUsers: int
    totalItems: int


# ─── RAG Models ────────────────────────────────────────────────────────────────

class RAGRequest(BaseModel):
    """Inbound request for the ``/v1/rag/ask`` endpoint.

    Attributes:
        query: The user's natural-language question.
        userId: Optional user ID for analytics.
        majorId: Optional major scope filter.
        courseId: Optional course scope filter.
        topK: Number of chunks to retrieve.
    """

    query: str
    userId: Optional[str] = None
    majorId: Optional[str] = None
    courseId: Optional[str] = None
    topK: int = Field(default=5, ge=1, le=20)


class RAGSource(BaseModel):
    """A single source citation in a RAG response."""

    slug: str
    itemType: str
    title: str
    score: float
    chunkText: str


class RAGResponse(BaseModel):
    """Response envelope for the ``/v1/rag/ask`` endpoint."""

    answer: str
    sources: list[RAGSource]
    model: str
    tokensUsed: int
    retrievalTimeMs: float
    generationTimeMs: float
