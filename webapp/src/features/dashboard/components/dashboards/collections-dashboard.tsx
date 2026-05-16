import { FolderOpen } from "lucide-react"

import { DashboardHeader } from "../dashboard-header"
import { EmptyPlaceholder } from "../empty-placeholder"

export function CollectionsDashboard() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Collections"
        description="Organize your resources into collections for easier discovery."
        actionLabel="New Collection"
        actionHref="/dashboard/collections/create"
        actionIcon={FolderOpen}
      />

      <EmptyPlaceholder
        icon={FolderOpen}
        title="No collections yet"
        description="Create your first collection to group related resources together."
      />
    </div>
  )
}
