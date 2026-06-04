import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  CreatorCollectionsPanel,
  CreatorResourcesPanel,
  CreatorTutorialsPanel,
} from "@/features/content"
import type {
  CollectionQueryItem,
  ContentResourceItem,
  ContentTutorialItem,
} from "@/features/content"

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
    <section className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Manage resources, collections, tutorials, and upload history from one
          creator workspace.
        </p>
      </div>

      <Tabs defaultValue="resources" className="w-full">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="mt-4">
          <CreatorResourcesPanel resources={resources} />
        </TabsContent>
        <TabsContent value="collections" className="mt-4">
          <CreatorCollectionsPanel
            resourceCollections={resourceCollections}
            tutorialCollections={tutorialCollections}
          />
        </TabsContent>
        <TabsContent value="tutorials" className="mt-4">
          <CreatorTutorialsPanel tutorials={tutorials} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
