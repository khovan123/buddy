import { Calendar, FolderOpen, Layers } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { CollectionQueryItem } from "@/features/content"
import {
  DashboardHeader,
  EmptyPlaceholder,
} from "@/features/dashboard"

import { ContentItemProgressScene } from "./content-item-progress-scene"

const EMPTY_COLLECTIONS: CollectionQueryItem[] = []

export function CreatorCollectionsPanel({
  resourceCollections = EMPTY_COLLECTIONS,
  tutorialCollections = EMPTY_COLLECTIONS,
  actionHref = "/home/collections/create",
}: {
  resourceCollections?: CollectionQueryItem[]
  tutorialCollections?: CollectionQueryItem[]
  actionHref?: string
}) {
  const collections = [...resourceCollections, ...tutorialCollections]

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Collections (${collections.length})`}
        description="Organize your resources into collections for easier discovery."
        actionLabel="New Collection"
        actionHref={actionHref}
        actionIcon={FolderOpen}
      />

      {collections.length === 0 ? (
        <EmptyPlaceholder
          icon={FolderOpen}
          title="No collections yet"
          description="Create your first collection to group related resources together."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {collections.map((collection) => (
            <article
              key={collection.id}
              className="rounded-lg border bg-card p-4 text-card-foreground"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">
                    {collection.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {collection.description || "No description"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{collection.type}</Badge>
                  <ContentItemProgressScene
                    status={collection.status}
                    verified={collection.status === "AVAILABLE"}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  {(collection._count?.resources ?? 0) +
                    (collection._count?.tutorials ?? 0)}{" "}
                  items
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {new Date(collection.createdAt).toLocaleDateString()}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
