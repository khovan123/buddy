"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
import type { LibraryCatalog } from "@/features/library/types"
import { useI18n } from "@/i18n/language-provider"
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
  icon: ComponentType<{ className?: string }>
}> = [
  { key: "all", icon: Grid2x2 },
  { key: "learning", icon: PlayCircle },
  { key: "resources", icon: FileText },
  { key: "collections", icon: FolderKanban },
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

function assetKindMeta(
  asset: LibraryAsset,
  copy: {
    tutorialSource: string
    startLearning: string
    tutorialMeta: string
    learningBadge: string
    resourceSource: string
    openResource: string
    referenceBadge: string
  }
) {
  if (asset.kind === LibraryAssetKind.Tutorial) {
    return {
      kind: "tutorial" as const,
      href: `/library/tutorials/${asset.slug}`,
      source: copy.tutorialSource,
      actionLabel: copy.startLearning,
      meta: copy.tutorialMeta,
      badge: copy.learningBadge,
      icon: Video,
    }
  }

  return {
    kind: "resource" as const,
    href: `/library/resources/${asset.slug}`,
    source: copy.resourceSource,
    actionLabel: copy.openResource,
    meta: asset.kind,
    badge: copy.referenceBadge,
    icon: BookOpen,
  }
}

function buildAssetItem(
  asset: LibraryAsset,
  copy: Parameters<typeof assetKindMeta>[1]
): WorkspaceItem {
  const meta = assetKindMeta(asset, copy)

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

function buildCollectionItems(
  catalog: LibraryCatalog,
  copy: {
    buddyExpert: string
    tutorialCollectionSource: string
    resourceCollectionSource: string
    openCollection: string
  }
): WorkspaceItem[] {
  return [
    ...catalog.tutorialCollections.map((collection) => ({
      id: `tutorial-collection:${collection.id}`,
      title: collection.title,
      description: collection.description,
      author: collection.author?.name ?? copy.buddyExpert,
      authorAvatar: collection.author?.avatar,
      image: collection.thumbnailUrl ?? "",
      href: collection.href,
      kind: "tutorial-collection" as const,
      source: copy.tutorialCollectionSource,
      actionLabel: copy.openCollection,
      meta: collection.count,
      badge: collection.discount ?? collection.price,
      icon: FolderKanban,
    })),
    ...catalog.resourceCollections.map((collection) => ({
      id: `resource-collection:${collection.id}`,
      title: collection.title,
      description: collection.description,
      author: collection.author?.name ?? copy.buddyExpert,
      authorAvatar: collection.author?.avatar,
      image: collection.thumbnailUrl ?? "",
      href: collection.href,
      kind: "resource-collection" as const,
      source: copy.resourceCollectionSource,
      actionLabel: copy.openCollection,
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
  copy,
}: {
  item?: WorkspaceItem
  onNavigate: (href: string) => void
  copy: {
    emptyTitle: string
    emptyDescription: string
    ready: string
    readyDescription: string
  }
}) {
  if (!item) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <div className="max-w-xs space-y-3">
          <Library className="mx-auto size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{copy.emptyTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {copy.emptyDescription}
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
            {copy.ready}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {copy.readyDescription}
          </p>
          <Button
            type="button"
            className="mt-auto w-full"
            onClick={() => onNavigate(item.href)}
          >
            {item.actionLabel}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

export default function LibraryBrowser({
  catalog,
}: LibraryBrowserProps) {
  const { t } = useI18n()
  const copy = useMemo(
    () => ({
        tabs: {
          all: t("library.browser.tabAll"),
          learning: t("library.browser.tabLearning"),
          resources: t("library.browser.tabResources"),
          collections: t("library.browser.tabCollections"),
        },
        tutorialSource: t("library.browser.tutorialSource"),
        startLearning: t("library.browser.startLearning"),
        tutorialMeta: t("library.browser.tutorialMeta"),
        learningBadge: t("library.browser.learningBadge"),
        resourceSource: t("library.browser.resourceSource"),
        openResource: t("library.browser.openResource"),
        referenceBadge: t("library.browser.referenceBadge"),
        buddyExpert: t("common.expertBuddy"),
        tutorialCollectionSource: t("library.browser.tutorialCollectionSource"),
        resourceCollectionSource: t("library.browser.resourceCollectionSource"),
        openCollection: t("library.browser.openCollection"),
        emptyTitle: t("library.browser.emptyTitle"),
        emptyDescription: t("library.browser.emptyDescription"),
        ready: t("library.browser.ready"),
        readyDescription: t("library.browser.readyDescription"),
        learningSpace: t("library.browser.learningSpace"),
        tutorials: t("library.browser.tutorials"),
        resources: t("library.browser.resources"),
        collections: t("library.browser.collections"),
        workspace: t("library.browser.workspace"),
        sort: t("library.browser.sort"),
        recent: t("library.browser.newest"),
        alphabetical: t("library.browser.alphabetical"),
        search: t("library.browser.search"),
        items: [
          t("library.browser.itemSingular"),
          t("library.browser.itemPlural"),
        ] as const,
        savedContent: t("library.browser.savedContent"),
        results: [
          t("library.browser.resultSingular"),
          t("library.browser.resultPlural"),
        ] as const,
        noResults: t("library.browser.noResults"),
        noResultsDescription: t("library.browser.noResultsDescription"),
        continueNext: t("library.browser.continueNext"),
        continueEmpty: t("library.browser.continueEmpty"),
      }),
    [t]
  )
  const router = useRouter()
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
      ...catalog.tutorials.map((item) => buildAssetItem(item, copy)),
      ...catalog.resources.map((item) => buildAssetItem(item, copy)),
      ...buildCollectionItems(catalog, copy),
    ],
    [catalog, copy]
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

  const navigateToItem = (href: string) => {
    persistBrowserState()
    router.push(href)
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
              {t("page.library.badge")}
            </Badge>
            <Badge className="rounded-md bg-primary/10 text-primary shadow-none hover:bg-primary/10">
              <Sparkles className="size-3" />
              {copy.learningSpace}
            </Badge>
          </div>
          <div className="max-w-3xl space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("page.library.title")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              {t("page.library.description")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-2">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-lg font-bold">{stats.tutorials}</p>
            <p className="text-xs text-muted-foreground">{copy.tutorials}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-lg font-bold">{stats.resources}</p>
            <p className="text-xs text-muted-foreground">{copy.resources}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-lg font-bold">{stats.collections}</p>
            <p className="text-xs text-muted-foreground">{copy.collections}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold">
              <Library className="size-4 text-primary" />
              {copy.workspace}
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
                      {copy.tabs[tab.key]}
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
                {copy.sort}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={sortMode === "recent" ? "secondary" : "outline"}
                onClick={() => setSortMode("recent")}
              >
                {copy.recent}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortMode === "alphabetical" ? "secondary" : "outline"}
                onClick={() => setSortMode("alphabetical")}
              >
                {copy.alphabetical}
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
                  {copy.search}
                </FieldLabel>
                <Input
                  id="library-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </Field>
            </div>
            <div className="flex items-center rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {formatCount(visibleItems.length, copy.items[0], copy.items[1])}
            </div>
          </div>

          <WorkspacePreview
            item={selectedItem}
            onNavigate={navigateToItem}
            copy={copy}
          />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{copy.savedContent}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatCount(visibleItems.length, copy.results[0], copy.results[1])}
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
                  <p className="text-sm font-medium">{copy.noResults}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.noResultsDescription}
                  </p>
                </div>
              )}
            </section>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-lg font-semibold">{copy.continueNext}</h2>
                <div className="mt-4 space-y-3">
                  {allItems.length > 0 ? (
                    allItems.slice(0, 4).map((item, index) => (
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
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {copy.continueEmpty}
                    </div>
                  )}
                </div>
              </div>
              {/* <LibraryRequestCard /> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
