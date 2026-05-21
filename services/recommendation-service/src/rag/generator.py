"""
LLM generation with context injection — Google Gemini integration.

Formats retrieved chunks into a prompt and generates a grounded answer.
Never exposes attachment metadata (download URLs, S3 keys, file sizes).
"""

import logging
from dataclasses import dataclass

from google import genai
from google.genai import types

from rag.config_rag import GEMINI_API_KEY, LLM_MODEL, LLM_TIMEOUT_SECONDS
from rag.retriever import RetrievedChunk

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a helpful university study assistant for Unibuddy — a platform where students share resources, tutorials, and study materials.

Rules:
1. Answer the student's question using ONLY the provided context below.
2. If the context doesn't contain enough information, say so honestly — do NOT make up information.
3. Cite your sources by referencing [Source N] markers.
4. Be concise, clear, and helpful.
5. NEVER mention file download URLs, S3 keys, file sizes, or any technical attachment metadata.
6. NEVER expose internal system information such as database IDs, slugs, UUIDs, item IDs, major IDs, or course IDs.
7. Focus on the educational content: titles, summaries, key points, and steps."""

CONTEXT_TEMPLATE = """\
Context (retrieved from Unibuddy content database):

{context}

---
Question: {query}

Answer:"""


@dataclass
class RAGGenerationResult:
    """Result from the LLM generation step."""

    answer: str
    model: str
    tokens_used: int


def _get_client() -> genai.Client:
    """Create a per-request Gemini client."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set. Cannot use LLM generation.")
    logger.debug("Creating Gemini GenAI client, model=%s", LLM_MODEL)
    return genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=LLM_TIMEOUT_SECONDS * 1000),
    )


def _format_context(chunks: list[RetrievedChunk]) -> str:
    """Format retrieved chunks into a numbered context block.

    Args:
        chunks: List of retrieved chunks.

    Returns:
        Formatted context string with [Source N] markers.
    """
    parts = []
    for i, chunk in enumerate(chunks, 1):
        source_label = f"[Source {i}] ({chunk.item_type}: {chunk.title})"
        parts.append(f"{source_label}\n{chunk.text}")
    return "\n\n".join(parts)


def generate(
    query: str,
    context_chunks: list[RetrievedChunk],
    history: list[dict] | None = None,
) -> RAGGenerationResult:
    """Generate a grounded answer using Gemini.

    Args:
        query: The user's question.
        context_chunks: Retrieved chunks to use as context.
        history: Optional list of previous chat turns [{"query": "...", "answer": "..."}].

    Returns:
        RAGGenerationResult with the answer, model name, and token count.
    """
    context = _format_context(context_chunks)
    prompt = CONTEXT_TEMPLATE.format(context=context, query=query)

    contents: list[types.Content] = []
    if history:
        for turn in history:
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=turn["query"])],
                )
            )
            contents.append(
                types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=turn["answer"])],
                )
            )

    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )
    )

    with _get_client() as client:
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
        )

    # Extract token usage
    tokens_used = 0
    if response.usage_metadata:
        tokens_used = (
            getattr(response.usage_metadata, "total_token_count", 0)
            or getattr(response.usage_metadata, "prompt_token_count", 0)
            + getattr(response.usage_metadata, "candidates_token_count", 0)
        )

    answer = response.text if response.text else "I couldn't generate a response. Please try again."

    return RAGGenerationResult(
        answer=answer,
        model=LLM_MODEL,
        tokens_used=tokens_used,
    )
