import type { Metadata } from "next"

import { ForumContent } from "@/features/forum/components/forum-content"

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Join Buddy forum discussions, follow trending topics, and chat with everyone in the community.",
  alternates: {
    canonical: "/forum",
  },
}

export default function ForumPage() {
  return <ForumContent />
}
