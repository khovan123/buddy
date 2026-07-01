import type { Metadata } from "next"

import {
  getMyResourceCollections,
  getMyTutorialCollections,
} from "@/features/content"
import {
  ContentPage,
  getMyResources,
  getMyTutorials,
} from "@/features/dashboard"
import { getServerTranslator } from "@/i18n/server"
import { requireCreatorAccess } from "@/lib/auth/server-role-access"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator()

  return {
    title: t("content.metaTitle"),
    description: t("content.metaDescription"),
  }
}

export default async function CreatorContentPage() {
  await requireCreatorAccess()

  const [
    tutorials,
    resources,
    resourceCollections,
    tutorialCollections,
  ] = await Promise.all([
    getMyTutorials(),
    getMyResources(),
    getMyResourceCollections(),
    getMyTutorialCollections(),
  ])

  return (
    <ContentPage
      tutorials={tutorials ?? []}
      resources={resources ?? []}
      resourceCollections={resourceCollections.data}
      tutorialCollections={tutorialCollections.data}
    />
  )
}
