"use client"

import type { RAGRequest, RAGResponse } from "../types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_API_BASE_URL ||
  "http://127.0.0.1:3000"

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
    throw new Error(`RAG request failed (${res.status}): ${errorText}`)
  }

  return res.json()
}
