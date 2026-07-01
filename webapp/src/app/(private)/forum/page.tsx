import type { Metadata } from "next"

import { ForumContent } from "@/features/forum/components/forum-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator()

  return {
    title: t("forum.meta.title"),
    description: t("forum.meta.description"),
    alternates: {
      canonical: "/forum",
    },
  }
}

export default function ForumPage() {
  return <ForumContent />
}
