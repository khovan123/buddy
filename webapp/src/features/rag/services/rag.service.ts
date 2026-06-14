"use client"

import type {
  RAGHistoryResponse,
  RAGRequest,
  RAGResponse,
  RAGRetrieveResponse,
} from "../types"

const API_BASE = process.env.NEXT_API_BASE_URL || "http://127.0.0.1:3000"

export class RAGServiceError extends Error {
  status: number
  isUnavailable: boolean

  constructor(status: number, message: string) {
    super(message)
    this.name = "RAGServiceError"
    this.status = status
    this.isUnavailable = status === 503 || status === 504 || status === 429
  }
}

/**
 * Ask a question to the RAG system via the API gateway.
 *
 * This is a client-side call (used from the chat component) so it
 * goes through the browser → API gateway → recommendation-service.
 */
export async function askRAG(
  request: RAGRequest,
  token?: string
): Promise<RAGResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}/v1/recommendations/rag/ask`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const error = await toRAGServiceError(res)
    if (error.isUnavailable) {
      const fallback = await retrieveRAG(request, token).catch(() => null)
      if (fallback) {
        return {
          answer:
            "I found relevant Unibuddy content, but the answer generator is temporarily unavailable. Please review the sources below or try again.",
          sources: fallback.sources,
          model: "",
          tokensUsed: 0,
          retrievalTimeMs: fallback.retrievalTimeMs,
          generationTimeMs: 0,
        }
      }
    }
    throw error
  }

  return res.json()
}

export async function getRAGHistory(
  token?: string
): Promise<RAGHistoryResponse> {
  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}/v1/recommendations/rag/history`, {
    method: "GET",
    headers,
  })

  if (!res.ok) {
    throw await toRAGServiceError(res)
  }

  return res.json()
}

async function retrieveRAG(
  request: RAGRequest,
  token?: string
): Promise<RAGRetrieveResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}/v1/recommendations/rag/retrieve`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw await toRAGServiceError(res)
  }

  return res.json()
}

async function toRAGServiceError(res: Response): Promise<RAGServiceError> {
  const errorText = await res.text().catch(() => "Unknown error")
  let message = errorText
  try {
    const parsed = JSON.parse(errorText) as { message?: string }
    message = parsed.message || errorText
  } catch {
    // Keep raw text for non-JSON errors.
  }
  return new RAGServiceError(res.status, message)
}
