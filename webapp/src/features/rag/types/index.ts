// ─── RAG Types ──────────────────────────────────────────────────────────────

export interface RAGSource {
  slug: string
  itemType: string
  title: string
  score: number
  chunkText: string
}

export interface RAGResponse {
  answer: string
  sources: RAGSource[]
  model: string
  tokensUsed: number
  retrievalTimeMs: number
  generationTimeMs: number
}

export interface RAGRequest {
  query: string
  userId?: string
  majorId?: string
  courseId?: string
  topK?: number
}

export interface RAGMessage {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: RAGSource[]
  retrievalTimeMs?: number
  generationTimeMs?: number
  timestamp: Date
}
