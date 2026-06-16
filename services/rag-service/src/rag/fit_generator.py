"""
Learning-fit draft generation using Gemini with optional RAG context.

The output is deliberately constrained to the LearningFit contract used by
content-service. If Gemini is unavailable or returns malformed JSON, callers can
fall back to deterministic metadata-based drafts.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from google import genai
from google.genai import types

from rag.config_rag import GEMINI_API_KEY, LLM_MODEL, LLM_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

FIT_SYSTEM_PROMPT = """\
You generate honest learning-fit metadata for Buddy, a university learning marketplace.

Return ONLY valid JSON. Do not include markdown fences.

Rules:
1. Be specific and honest. Never say the content is for everyone.
2. Include at least one "notFor" limitation.
3. Use only the supplied content metadata and retrieved context.
4. Do not invent credentials, guarantees, ratings, page counts, prices, or hidden content.
5. Keep each list item short and student-facing.
6. Output must match this JSON shape exactly:
{
  "bestFor": ["..."],
  "notFor": ["..."],
  "startHere": [{"title": "...", "description": "...", "order": 1, "targetType": "AI_PROMPT", "aiPrompt": "..."}],
  "coveredTopics": ["..."],
  "notCoveredTopics": ["..."],
  "learningOutcomes": ["..."],
  "estimatedStudyTimeMinutes": 45,
  "difficulty": "BEGINNER|INTERMEDIATE|ADVANCED",
  "fitEvidence": [{"claim": "...", "sourceType": "AI_GENERATED", "sourceRef": "...", "confidence": 0.7}]
}
"""


@dataclass
class FitGenerationResult:
    learning_fit: dict[str, Any]
    model: str
    tokens_used: int


def _get_client() -> genai.Client:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set. Cannot generate fit draft.")
    return genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=LLM_TIMEOUT_SECONDS * 1000),
    )


def _extract_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("Fit draft response must be a JSON object.")
    return parsed


def _strings(value: Any, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            cleaned.append(item.strip()[:180])
        if len(cleaned) >= limit:
            break
    return cleaned


def _start_here(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    steps: list[dict[str, Any]] = []
    for index, item in enumerate(value[:5], 1):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        target_type = item.get("targetType") or "AI_PROMPT"
        if target_type not in {"SECTION", "FILE", "VIDEO_STEP", "COLLECTION_PHASE", "AI_PROMPT"}:
            target_type = "AI_PROMPT"
        steps.append(
            {
                "title": title[:120],
                "description": str(item.get("description") or "").strip()[:240] or None,
                "order": int(item.get("order") or index),
                "targetType": target_type,
                "targetId": str(item.get("targetId") or "").strip()[:128] or None,
                "aiPrompt": str(item.get("aiPrompt") or "").strip()[:240] or None,
            }
        )
    return sorted(steps, key=lambda step: step["order"])


def _difficulty(value: Any) -> str | None:
    raw = str(value or "").strip().upper()
    return raw if raw in {"BEGINNER", "INTERMEDIATE", "ADVANCED"} else None


def _evidence(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    items: list[dict[str, Any]] = []
    for item in value[:8]:
        if not isinstance(item, dict):
            continue
        claim = str(item.get("claim") or "").strip()
        if not claim:
            continue
        confidence = item.get("confidence")
        try:
            confidence = float(confidence) if confidence is not None else None
        except (TypeError, ValueError):
            confidence = None
        items.append(
            {
                "claim": claim[:180],
                "sourceType": item.get("sourceType")
                if item.get("sourceType")
                in {"METADATA", "CONTENT_EXTRACTION", "CREATOR_INPUT", "AI_GENERATED", "MODERATION"}
                else "AI_GENERATED",
                "sourceRef": str(item.get("sourceRef") or "").strip()[:128] or None,
                "confidence": confidence,
            }
        )
    return items


def normalize_fit_payload(payload: dict[str, Any]) -> dict[str, Any]:
    best_for = _strings(payload.get("bestFor"), 5)
    not_for = _strings(payload.get("notFor"), 5)
    start_here = _start_here(payload.get("startHere"))
    fit_evidence = _evidence(payload.get("fitEvidence"))

    has_required_fit = bool(best_for and not_for and start_here)
    fit_status = (
        "VERIFIED"
        if has_required_fit and fit_evidence
        else "NEEDS_EVIDENCE"
        if has_required_fit
        else "DRAFT"
    )
    now = datetime.now(timezone.utc).isoformat()

    return {
        "bestFor": best_for,
        "notFor": not_for,
        "startHere": start_here,
        "coveredTopics": _strings(payload.get("coveredTopics"), 12),
        "notCoveredTopics": _strings(payload.get("notCoveredTopics"), 12),
        "learningOutcomes": _strings(payload.get("learningOutcomes"), 8),
        "estimatedStudyTimeMinutes": payload.get("estimatedStudyTimeMinutes")
        if isinstance(payload.get("estimatedStudyTimeMinutes"), int)
        else None,
        "difficulty": _difficulty(payload.get("difficulty")),
        "fitStatus": fit_status,
        "fitEvidence": fit_evidence,
        "fitGeneratedAt": now,
        "fitVerifiedAt": now if fit_status == "VERIFIED" else None,
    }


def fallback_fit_draft(content: dict[str, Any], sources: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    title = str(content.get("title") or "this content").strip()
    content_type = str(content.get("contentType") or "RESOURCE").lower().replace("_", " ")
    highlights = [str(item).strip() for item in content.get("hightlights") or [] if str(item).strip()]
    topics = highlights[:4]

    source_ref = "metadata"
    if sources:
        source_ref = sources[0].get("itemId") or sources[0].get("slug") or "rag-source"

    return normalize_fit_payload(
        {
            "bestFor": [f"Students who need a guided first pass through {title}"],
            "notFor": [f"Students who need a complete replacement for the full course"],
            "startHere": [
                {
                    "title": "Review the overview first",
                    "description": f"Skim the main points before working through the {content_type}.",
                    "order": 1,
                    "targetType": "AI_PROMPT",
                    "aiPrompt": f"Quiz me on the key ideas from {title}",
                }
            ],
            "coveredTopics": topics,
            "notCoveredTopics": ["Full course replacement"],
            "learningOutcomes": [f"Decide how to use {title} in a focused study session"],
            "estimatedStudyTimeMinutes": 45,
            "difficulty": "INTERMEDIATE",
            "fitEvidence": [
                {
                    "claim": "Draft generated from supplied title, description, highlights, and retrieved context.",
                    "sourceType": "METADATA",
                    "sourceRef": source_ref,
                    "confidence": 0.55,
                }
            ],
        }
    )


def generate_fit_draft(content: dict[str, Any], sources: list[dict[str, Any]] | None = None) -> FitGenerationResult:
    prompt = json.dumps(
        {
            "content": content,
            "retrievedContext": sources or [],
        },
        ensure_ascii=False,
    )

    with _get_client() as client:
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
            config=types.GenerateContentConfig(
                system_instruction=FIT_SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )

    tokens_used = 0
    if response.usage_metadata:
        tokens_used = (
            getattr(response.usage_metadata, "total_token_count", 0)
            or getattr(response.usage_metadata, "prompt_token_count", 0)
            + getattr(response.usage_metadata, "candidates_token_count", 0)
        )

    raw = response.text if response.text else "{}"
    parsed = _extract_json(raw)
    return FitGenerationResult(
        learning_fit=normalize_fit_payload(parsed),
        model=LLM_MODEL,
        tokens_used=tokens_used,
    )
