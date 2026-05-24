"use client"

import { useEffect, useMemo, useState } from "react"

import {
  FileText,
  Filter,
  FolderKanban,
  Grid2x2,
  Search,
  Video,
} from "lucide-react"

import {
  CollectionCard,
  type CollectionCardData,
} from "@/components/molecules/collection-card"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemMedia } from "@/components/ui/item"
import {
  LibraryAssetCard,
  type LibraryAsset,
} from "@/features/library/components/library-asset-card"
import { LibraryRequestCard } from "@/features/library/components/library-request-card"
import type { LibraryCatalog } from "@/features/library/data/library-assets"

type LibraryTab =
  | "all"
  | "tutorials"
  | "resources"
  | "tutorial-collections"
  | "resource-collections"
type SortMode = "recent" | "alphabetical" | "purchased"

type LibraryBrowserProps = {
  catalog: LibraryCatalog
  seoBadge: string
  seoTitle: string
  seoDescription: string
}

type LibraryBrowserSavedState = {
  activeTab?: LibraryTab
  sortMode?: SortMode
  query?: string
  scrollY?: number
  restoreOnNextMount?: boolean
}

const LIBRARY_BROWSER_STATE_KEY = "library-browser-state"

const tabConfig: Array<{
  key: LibraryTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { key: "all", label: "All", icon: Grid2x2 },
  { key: "tutorials", label: "Tutorials", icon: Video },
  { key: "resources", label: "Resources", icon: FileText },
  {
    key: "tutorial-collections",
    label: "Tutorial Collections",
    icon: FolderKanban,
  },
  {
    key: "resource-collections",
    label: "Resource Collections",
    icon: FolderKanban,
  },
]

function sortAssets(assets: LibraryAsset[], sortMode: SortMode) {
  if (sortMode === "alphabetical") {
    return [...assets].sort((a, b) => a.title.localeCompare(b.title))
  }

  if (sortMode === "purchased") {
    return [...assets].sort((a, b) => Number(a.disabled) - Number(b.disabled))
  }

  return assets
}

function canUseSessionStorage() {
  return "sessionStorage" in globalThis
}

function readSavedState(): LibraryBrowserSavedState | null {
  if (!canUseSessionStorage()) {
    return null
  }

  const rawState = globalThis.sessionStorage.getItem(LIBRARY_BROWSER_STATE_KEY)

  if (!rawState) {
    return null
  }

  try {
    return JSON.parse(rawState) as LibraryBrowserSavedState
  } catch {
    globalThis.sessionStorage.removeItem(LIBRARY_BROWSER_STATE_KEY)
    return null
  }
}

export default function LibraryBrowser({
  catalog,
  seoBadge,
  seoTitle,
  seoDescription,
}: LibraryBrowserProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>(() => {
    const savedState = readSavedState()
    return savedState?.restoreOnNextMount && savedState.activeTab
      ? savedState.activeTab
      : "all"
  })

  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const savedState = readSavedState()
    return savedState?.restoreOnNextMount && savedState.sortMode
      ? savedState.sortMode
      : "recent"
  })

  const [query, setQuery] = useState(() => {
    const savedState = readSavedState()
    return savedState?.restoreOnNextMount ? (savedState.query ?? "") : ""
  })

  useEffect(() => {
    const savedState = readSavedState()

    if (!savedState?.restoreOnNextMount || !canUseSessionStorage()) {
      return
    }

    globalThis.sessionStorage.setItem(
      LIBRARY_BROWSER_STATE_KEY,
      JSON.stringify({
        ...savedState,
        restoreOnNextMount: false,
      })
    )

    if (typeof savedState.scrollY === "number" && "scrollTo" in globalThis) {
      requestAnimationFrame(() => {
        globalThis.scrollTo({ top: savedState.scrollY, behavior: "auto" })
      })
    }
  }, [])

  const persistBrowserState = () => {
    if (!canUseSessionStorage()) {
      return
    }

    globalThis.sessionStorage.setItem(
      LIBRARY_BROWSER_STATE_KEY,
      JSON.stringify({
        activeTab,
        sortMode,
        query,
        scrollY: "scrollY" in globalThis ? globalThis.scrollY : 0,
        restoreOnNextMount: true,
      })
    )
  }

  const visibleContent = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase()
    const filterByQuery = (
      title: string,
      description: string,
      author?: string
    ) => {
      return (
        title.toLowerCase().includes(lowerQuery) ||
        description.toLowerCase().includes(lowerQuery) ||
        (author?.toLowerCase().includes(lowerQuery) ?? false)
      )
    }

    const assetsByTab: Record<LibraryTab, LibraryAsset[]> = {
      all: [...catalog.tutorials, ...catalog.resources],
      tutorials: catalog.tutorials,
      resources: catalog.resources,
      "tutorial-collections": [],
      "resource-collections": [],
    }

    const collectionsByTab: Record<
      "all" | "tutorial-collections" | "resource-collections",
      CollectionCardData[]
    > = {
      all: [...catalog.resourceCollections, ...catalog.tutorialCollections],
      "tutorial-collections": [...catalog.tutorialCollections],
      "resource-collections": [...catalog.resourceCollections],
    }

    let nextAssets = assetsByTab[activeTab]
    let nextCollections =
      activeTab === "all" ||
      activeTab === "tutorial-collections" ||
      activeTab === "resource-collections"
        ? collectionsByTab[activeTab]
        : []

    if (lowerQuery) {
      nextAssets = nextAssets.filter((asset) =>
        filterByQuery(asset.title, asset.description, asset.author)
      )
      nextCollections = nextCollections.filter((collection) =>
        filterByQuery(collection.title, collection.description)
      )
    }

    const sortedCollections =
      sortMode === "alphabetical"
        ? [...nextCollections].sort((a, b) => a.title.localeCompare(b.title))
        : nextCollections

    return {
      assets: sortAssets(nextAssets, sortMode),
      collections: sortedCollections,
    }
  }, [activeTab, catalog, query, sortMode])

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 rounded-3xl border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            {seoBadge}
          </p>
          <h1 className="line-clamp-1 text-3xl font-extrabold tracking-tight text-foreground">
            {seoTitle}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {seoDescription}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
          <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/40 px-3 py-2 backdrop-blur md:w-auto">
            <div className="flex flex-col">
              <span className="text-2xs font-bold tracking-wider text-muted-foreground uppercase">
                Storage
              </span>
              <span className="text-xs font-medium">12.4 / 20 GB</span>
            </div>
            <div className="h-2 w-24 overflow-hidden rounded-full border border-border/50 bg-muted">
              <div className="h-full w-[65%] rounded-full bg-primary" />
            </div>
          </div>
          <div className="flex w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground shadow-xs backdrop-blur transition-colors focus-within:border-primary/50">
            <Item variant="default" size="xs" className="w-auto border-0 p-0">
              <ItemMedia variant="icon">
                <Search className="size-4" />
              </ItemMedia>
            </Item>
            <Field className="gap-0">
              <FieldLabel htmlFor="library-search" className="sr-only">
                Search my library
              </FieldLabel>
              <Input
                id="library-search"
                className="h-auto w-full border-0 bg-transparent p-0 text-sm text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
                placeholder="Search my library..."
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Horizontal Category Nav (Replaces left sidebar) */}
        <div className="sticky top-17 z-30 -mx-1 flex flex-col gap-4 bg-background/80 px-1 py-2 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
          <div className="flex flex-col items-start justify-between gap-4 border-y border-border/40 py-2 md:flex-row md:items-center">
            <div className="scrollbar-hide flex-1 overflow-x-auto overflow-y-hidden py-1 whitespace-nowrap">
              <div className="flex w-max items-center space-x-2">
                {tabConfig.map((tab) => {
                  const TabIcon = tab.icon
                  const isActive = activeTab === tab.key
                  return (
                    <Button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      variant={isActive ? "secondary" : "outline"}
                      className={`h-9 gap-2 rounded-full transition-colors ${
                        isActive
                          ? "border-primary/20 bg-primary/10 text-primary shadow-xs hover:bg-primary/20"
                          : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <TabIcon className="size-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="flex shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-2 rounded-full border border-border/50 bg-background/50 shadow-xs hover:bg-accent/50"
              >
                <Filter className="size-4" />
                <span className="text-sm font-medium">Filter</span>
              </Button>
            </div>
          </div>
        </div>

        <section className="space-y-6 px-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={sortMode === "recent" ? "secondary" : "outline"}
                onClick={() => setSortMode("recent")}
              >
                Recent
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortMode === "alphabetical" ? "secondary" : "outline"}
                onClick={() => setSortMode("alphabetical")}
              >
                Alphabetical
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortMode === "purchased" ? "secondary" : "outline"}
                onClick={() => setSortMode("purchased")}
              >
                Purchased Date
              </Button>
            </div>
          </div>

          <div className="grid auto-rows-fr items-stretch gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {visibleContent.assets.map((asset) => (
              <LibraryAssetCard
                key={asset.title}
                asset={asset}
                onClick={persistBrowserState}
              />
            ))}

            {visibleContent.collections.map((collection) => (
              <CollectionCard
                key={collection.title}
                collection={collection}
                onClick={persistBrowserState}
              />
            ))}

            {activeTab !== "tutorial-collections" &&
            activeTab !== "resource-collections" ? (
              <LibraryRequestCard />
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}
