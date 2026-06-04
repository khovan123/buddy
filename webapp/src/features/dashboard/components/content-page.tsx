import type { CollectionQueryItem } from "@/features/content"

import type {
  ContentResourceItem,
  ContentTutorialItem,
} from "../services/dashboard.service"
import { CollectionsDashboard } from "./dashboards/collections-dashboard"
import { ResourcesDashboard } from "./dashboards/resources-dashboard"
import { TutorialsDashboard } from "./dashboards/tutorials-dashboard"

export function ContentPage({
  tutorials,
  resources,
  resourceCollections,
  tutorialCollections,
}: {
  tutorials: ContentTutorialItem[]
  resources: ContentResourceItem[]
  resourceCollections: CollectionQueryItem[]
  tutorialCollections: CollectionQueryItem[]
}) {
  return (
    <section className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Manage tutorials, resources, collections, and upload history from one
          creator workspace.
        </p>
      </div>

      <TutorialsDashboard tutorials={tutorials} />
      <ResourcesDashboard resources={resources} />
      <CollectionsDashboard
        resourceCollections={resourceCollections}
        tutorialCollections={tutorialCollections}
      />
    </section>
  )
}
