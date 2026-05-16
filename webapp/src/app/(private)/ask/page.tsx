import type { Metadata } from "next"

import { RAGChat } from "@/features/rag/components/rag-chat"
import { getMe } from "@/features/user/services/user.service"
import { getAccessToken } from "@/lib/server-session"

export const metadata: Metadata = {
  title: "AI Study Assistant — Unibuddy",
  description:
    "Ask questions about your courses and study materials. Unibuddy's AI assistant searches through resources and tutorials to give you grounded, cited answers.",
}

export default async function AskPage() {
  const [user, token] = await Promise.all([getMe(), getAccessToken()])
  return <RAGChat user={user ?? undefined} accessToken={token ?? undefined} />
}
