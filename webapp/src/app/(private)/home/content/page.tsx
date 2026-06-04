import type { Metadata } from "next"

import {
  ContentPage,
  getMyResources,
  getMyTutorials,
} from "@/features/dashboard"
import {
  getMyResourceCollections,
  getMyTutorialCollections,
} from "@/features/content"
import { requireCreatorAccess } from "@/lib/auth/server-role-access"

export const metadata: Metadata = {
  title: "Content",
  description: "Manage creator tutorials, resources, and collections.",
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
