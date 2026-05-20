"use client"

import type { RAGRequest, RAGResponse } from "../types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_API_BASE_URL ||
  "http://127.0.0.1:3000"

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
    const errorText = await res.text().catch(() => "Unknown error")
    let message = errorText
    try {
      const parsed = JSON.parse(errorText) as { message?: string }
      message = parsed.message || errorText
    } catch {
      // Keep raw text for non-JSON errors.
    }
    throw new RAGServiceError(res.status, message)
  }

  return res.json()
}
