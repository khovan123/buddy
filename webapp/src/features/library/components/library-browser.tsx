"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"

import Image from "next/image"
import Link from "next/link"

import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderKanban,
  Grid2x2,
  Library,
  PlayCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Video,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  LibraryAssetKind,
  type LibraryAsset,
} from "@/features/library/components/library-asset-card"
import { LibraryRequestCard } from "@/features/library/components/library-request-card"
import type { LibraryCatalog } from "@/features/library/data/library-assets"
import { cn } from "@/lib/utils"

type LibraryTab = "all" | "learning" | "resources" | "collections"
type SortMode = "recent" | "alphabetical"
type WorkspaceItemKind =
  | "tutorial"
  | "resource"
  | "tutorial-collection"
  | "resource-collection"

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
  selectedItemId?: string
  scrollY?: number
  restoreOnNextMount?: boolean
}

type WorkspaceItem = {
  id: string
  title: string
  description: string
  author: string
  authorAvatar?: string
  image: string
  href: string
  kind: WorkspaceItemKind
  source: string
  actionLabel: string
  meta: string
  badge: string
  icon: ComponentType<{ className?: string }>
}

const LIBRARY_BROWSER_STATE_KEY = "library-browser-state"

const workspaceTabs: Array<{
  key: LibraryTab
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { key: "all", label: "Workspace", icon: Grid2x2 },
  { key: "learning", label: "Learn", icon: PlayCircle },
  { key: "resources", label: "Resources", icon: FileText },
  { key: "collections", label: "Collections", icon: FolderKanban },
]

function canUseSessionStorage() {
  return typeof globalThis !== "undefined" && "sessionStorage" in globalThis
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

function assetKindMeta(asset: LibraryAsset) {
  if (asset.kind === LibraryAssetKind.Tutorial) {
    return {
      kind: "tutorial" as const,
      href: `/library/tutorials/${asset.slug}`,
      source: "Tutorial",
      actionLabel: "Start lesson",
      meta: "Video lesson",
      badge: "Learning",
      icon: Video,
    }
  }

  return {
    kind: "resource" as const,
    href: `/library/resources/${asset.slug}`,
    source: "Resource",
    actionLabel: "Open resource",
    meta: asset.kind,
    badge: "Reference",
    icon: BookOpen,
  }
}

function buildAssetItem(asset: LibraryAsset): WorkspaceItem {
  const meta = assetKindMeta(asset)

  return {
    id: `${meta.kind}:${asset.slug}`,
    title: asset.title,
    description: asset.description,
    author: asset.author,
    authorAvatar: asset.authorAvatar,
    image: asset.image,
    ...meta,
  }
}

function buildCollectionItems(catalog: LibraryCatalog): WorkspaceItem[] {
  return [
    ...catalog.tutorialCollections.map((collection) => ({
      id: `tutorial-collection:${collection.id}`,
      title: collection.title,
      description: collection.description,
      author: collection.author?.name ?? "Buddy Expert",
      authorAvatar: collection.author?.avatar,
      image: collection.thumbnailUrl ?? "",
      href: collection.href,
      kind: "tutorial-collection" as const,
      source: "Tutorial collection",
      actionLabel: "Open collection",
      meta: collection.count,
      badge: collection.discount ?? collection.price,
      icon: FolderKanban,
    })),
    ...catalog.resourceCollections.map((collection) => ({
      id: `resource-collection:${collection.id}`,
      title: collection.title,
      description: collection.description,
      author: collection.author?.name ?? "Buddy Expert",
      authorAvatar: collection.author?.avatar,
      image: collection.thumbnailUrl ?? "",
      href: collection.href,
      kind: "resource-collection" as const,
      source: "Resource collection",
      actionLabel: "Open collection",
      meta: collection.count,
      badge: collection.discount ?? collection.price,
      icon: FolderKanban,
    })),
  ]
}

function sortItems(items: WorkspaceItem[], sortMode: SortMode) {
  if (sortMode === "alphabetical") {
    return [...items].sort((a, b) => a.title.localeCompare(b.title))
  }

  return items
}

function filterItems(
  items: WorkspaceItem[],
  activeTab: LibraryTab,
  query: string,
  sortMode: SortMode
) {
  const lowerQuery = query.trim().toLowerCase()
  const byTab = items.filter((item) => {
    if (activeTab === "learning") {
      return item.kind === "tutorial" || item.kind === "tutorial-collection"
    }

    if (activeTab === "resources") {
      return item.kind === "resource"
    }

    if (activeTab === "collections") {
      return (
        item.kind === "tutorial-collection" ||
        item.kind === "resource-collection"
      )
    }

    return true
  })

  const byQuery = lowerQuery
    ? byTab.filter((item) =>
        [item.title, item.description, item.author, item.source].some((value) =>
          value.toLowerCase().includes(lowerQuery)
        )
      )
    : byTab

  return sortItems(byQuery, sortMode)
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function WorkspaceItemRow({
  item,
  active,
  onSelect,
}: {
  item: WorkspaceItem
  active: boolean
  onSelect: () => void
}) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary/35 bg-primary/8"
          : "border-border/70 bg-background hover:bg-muted/60"
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-md border",
          active
            ? "border-primary/20 bg-primary/12 text-primary"
            : "border-border bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          {item.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.source} · {item.meta}
        </span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}

function WorkspacePreview({
  item,
  onNavigate,
}: {
  item?: WorkspaceItem
  onNavigate: () => void
}) {
  if (!item) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <div className="max-w-xs space-y-3">
          <Library className="mx-auto size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No library items yet</h2>
          <p className="text-sm text-muted-foreground">
            Purchased and saved learning content will appear here.
          </p>
        </div>
      </div>
    )
  }

  const Icon = item.icon

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[16/9] bg-muted">
        {item.image ? (
          <Image
            fill
            src={item.image}
            alt={item.title}
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="size-14 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/88 via-background/12 to-transparent" />
        <div className="absolute right-4 bottom-4 left-4 flex flex-wrap items-center gap-2">
          <Badge className="rounded-md bg-background/85 text-foreground shadow-none backdrop-blur">
            {item.source}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-md border-white/20 bg-background/70 backdrop-blur"
          >
            {item.badge}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {item.title}
            </h2>
            <p className="line-clamp-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={item.authorAvatar} alt={item.author} />
              <AvatarFallback>{item.author.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {item.author}
              </p>
              <p className="text-xs text-muted-foreground">{item.meta}</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-48 flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 text-primary" />
            Ready
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Continue from this workspace without leaving your library context.
          </p>
          <Button asChild className="mt-auto w-full" onClick={onNavigate}>
            <Link href={item.href}>
              {item.actionLabel}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}

export default function LibraryBrowser({
  catalog,
  seoBadge,
  seoTitle,
  seoDescription,
}: LibraryBrowserProps) {
  const savedState = readSavedState()
  const [activeTab, setActiveTab] = useState<LibraryTab>(
    savedState?.restoreOnNextMount && savedState.activeTab
      ? savedState.activeTab
      : "all"
  )
  const [sortMode, setSortMode] = useState<SortMode>(
    savedState?.restoreOnNextMount && savedState.sortMode
      ? savedState.sortMode
      : "recent"
  )
  const [query, setQuery] = useState(
    savedState?.restoreOnNextMount ? (savedState.query ?? "") : ""
  )
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    savedState?.restoreOnNextMount ? savedState.selectedItemId : undefined
  )

  const allItems = useMemo(
    () => [
      ...catalog.tutorials.map(buildAssetItem),
      ...catalog.resources.map(buildAssetItem),
      ...buildCollectionItems(catalog),
    ],
    [catalog]
  )

  const visibleItems = useMemo(
    () => filterItems(allItems, activeTab, query, sortMode),
    [activeTab, allItems, query, sortMode]
  )

  const selectedItem = useMemo(() => {
    return (
      visibleItems.find((item) => item.id === selectedItemId) ?? visibleItems[0]
    )
  }, [selectedItemId, visibleItems])

  useEffect(() => {
    const state = readSavedState()

    if (!state?.restoreOnNextMount || !canUseSessionStorage()) {
      return
    }

    globalThis.sessionStorage.setItem(
      LIBRARY_BROWSER_STATE_KEY,
      JSON.stringify({
        ...state,
        restoreOnNextMount: false,
      })
    )

    if (typeof state.scrollY === "number" && "scrollTo" in globalThis) {
      requestAnimationFrame(() => {
        globalThis.scrollTo({ top: state.scrollY, behavior: "auto" })
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
        selectedItemId: selectedItem?.id,
        scrollY: "scrollY" in globalThis ? globalThis.scrollY : 0,
        restoreOnNextMount: true,
      })
    )
  }

  const stats = {
    resources: catalog.resources.length,
    tutorials: catalog.tutorials.length,
    collections:
      catalog.resourceCollections.length + catalog.tutorialCollections.length,
  }

  const tabCounts: Record<LibraryTab, number> = {
    all: allItems.length,
    learning: catalog.tutorials.length + catalog.tutorialCollections.length,
    resources: catalog.resources.length,
    collections: stats.collections,
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md">
              {seoBadge}
            </Badge>
            <Badge className="rounded-md bg-primary/10 text-primary shadow-none hover:bg-primary/10">
              <Sparkles className="size-3" />
              Workspace
            </Badge>
          </div>
          <div className="max-w-3xl space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {seoTitle}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              {seoDescription}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-2">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-lg font-bold">{stats.tutorials}</p>
            <p className="text-xs text-muted-foreground">Tutorials</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-lg font-bold">{stats.resources}</p>
            <p className="text-xs text-muted-foreground">Resources</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-lg font-bold">{stats.collections}</p>
            <p className="text-xs text-muted-foreground">Collections</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold">
              <Library className="size-4 text-primary" />
              Library
            </div>
            <div className="grid gap-2">
              {workspaceTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {tab.label}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs",
                        isActive
                          ? "bg-primary-foreground/18 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tabCounts[tab.key]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="size-4 text-primary" />
                Sort
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
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
                A-Z
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Field className="min-w-0 flex-1 gap-0">
                <FieldLabel htmlFor="library-search" className="sr-only">
                  Search library
                </FieldLabel>
                <Input
                  id="library-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search library"
                  className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </Field>
            </div>
            <div className="flex items-center rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {formatCount(visibleItems.length, "item", "items")}
            </div>
          </div>

          <WorkspacePreview item={selectedItem} onNavigate={persistBrowserState} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Content</h2>
                <p className="text-sm text-muted-foreground">
                  {formatCount(visibleItems.length, "result", "results")}
                </p>
              </div>

              {visibleItems.length > 0 ? (
                <div className="grid gap-2">
                  {visibleItems.map((item) => (
                    <WorkspaceItemRow
                      key={item.id}
                      item={item}
                      active={selectedItem?.id === item.id}
                      onSelect={() => setSelectedItemId(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                  <p className="text-sm font-medium">No matching content</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another search or category.
                  </p>
                </div>
              )}
            </section>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-lg font-semibold">Learning Queue</h2>
                <div className="mt-4 space-y-3">
                  {allItems.slice(0, 4).map((item, index) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={persistBrowserState}
                      className="flex items-center gap-3 rounded-md border border-border bg-background p-2 transition-colors hover:bg-muted"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.source}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <LibraryRequestCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
