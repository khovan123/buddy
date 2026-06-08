import type { Metadata } from "next"

import { ForumPage } from "@/features/forum/components/forum-page"

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Join Buddy forum discussions, follow trending topics, and chat with everyone in the community.",
  alternates: {
    canonical: "/forum",
  },
}

export default function Page() {
  return <ForumPage />
}
