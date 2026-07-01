"use client"

import { useEffect, useMemo } from "react"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  MotionSection,
  MotionStagger,
} from "@/components/atoms/motion-primitives"
import {
  CollectionCard,
  type CollectionCardData,
} from "@/components/molecules/collection-card"
import {
  ResourceCard,
  type ResourceCardData,
} from "@/components/molecules/resource-card"
import {
  TutorialCard,
  type TutorialCardData,
} from "@/components/molecules/tutorial-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/i18n/language-provider"

type ExploreCollection = CollectionCardData & {
  mode: ExploreMode
}

type ExploreModeSwitcherProps = {
  collections: ExploreCollection[]
  resources: ResourceCardData[]
  tutorials: TutorialCardData[]
  isFiltered?: boolean
}

type ExploreMode = "resources" | "tutorials"

type SavedExploreState = {
  mode: ExploreMode
  scrollY: number
}

const EXPLORE_SWITCHER_STATE_KEY = "explore-switcher-state"

function parseMode(value: string | null): ExploreMode {
  return value === "tutorials" ? "tutorials" : "resources"
}

export function ExploreModeSwitcher({
  collections,
  resources,
  tutorials,
  isFiltered = false,
}: ExploreModeSwitcherProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = useMemo(
    () => parseMode(searchParams.get("mode")),
    [searchParams]
  )

  useEffect(() => {
    if (pathname !== "/explore") {
      return
    }

    const hasRestoreParam = searchParams.has("restore")
    if (!hasRestoreParam) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete("restore")

    const nextQuery = nextSearchParams.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    globalThis.window.history.replaceState(null, "", nextUrl)
  }, [pathname, searchParams])

  useEffect(() => {
    if (pathname !== "/explore") {
      return
    }

    const shouldRestore = searchParams.get("restore") === "1"
    if (!shouldRestore) {
      return
    }

    const savedStateRaw = sessionStorage.getItem(EXPLORE_SWITCHER_STATE_KEY)
    if (!savedStateRaw) {
      return
    }

    try {
      const savedState = JSON.parse(savedStateRaw) as SavedExploreState
      if (savedState.mode !== mode) {
        return
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          globalThis.window.scrollTo({ top: savedState.scrollY })
        })
      })
    } catch {
      sessionStorage.removeItem(EXPLORE_SWITCHER_STATE_KEY)
    }
  }, [mode, pathname, searchParams])

  const handleModeChange = (value: string) => {
    const nextMode = parseMode(value)
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set("mode", nextMode)
    nextSearchParams.delete("restore")
    const nextQuery = nextSearchParams.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextUrl, { scroll: false })
  }

  const rememberExploreState = () => {
    const savedState: SavedExploreState = {
      mode,
      scrollY: globalThis.window.scrollY,
    }

    sessionStorage.setItem(
      EXPLORE_SWITCHER_STATE_KEY,
      JSON.stringify(savedState)
    )
  }

  const filteredCollections = useMemo(
    () => collections.filter((collection) => collection.mode === mode),
    [collections, mode]
  )
  const sharedSearchParams = useMemo(() => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete("mode")
    nextSearchParams.delete("restore")
    return nextSearchParams.toString()
  }, [searchParams])
  const buildHref = (basePath: string) =>
    sharedSearchParams ? `${basePath}?${sharedSearchParams}` : basePath
  const topCollectionsTitle =
    isFiltered
      ? mode === "resources"
        ? t("explore.list.allCollections")
        : t("explore.list.allTutorialCollections")
      : mode === "resources"
      ? t("explore.switcher.resourceCollectionsTitle")
      : t("explore.switcher.tutorialCollectionsTitle")
  const topCollectionsDescription =
    isFiltered
      ? mode === "resources"
        ? t("explore.list.allResourceCollectionsDescription")
        : t("explore.list.allTutorialCollectionsDescription")
      : mode === "resources"
      ? t("explore.switcher.resourceCollectionsDescription")
      : t("explore.switcher.tutorialCollectionsDescription")
  const topTitle =
    isFiltered
      ? mode === "resources"
        ? t("explore.list.allResources")
        : t("explore.list.allTutorials")
      : mode === "resources"
      ? t("explore.switcher.resourceTitle")
      : t("explore.switcher.tutorialTitle")
  const topDescription =
    isFiltered
      ? mode === "resources"
        ? t("explore.list.allResourcesDescription")
        : t("explore.list.allTutorialsDescription")
      : mode === "resources"
      ? t("explore.switcher.resourceDescription")
      : t("explore.switcher.tutorialDescription")

  const collectionsHref =
    mode === "resources"
      ? buildHref("/explore/resources/collections")
      : buildHref("/explore/tutorials/collections")
  const contentHref =
    mode === "resources"
      ? buildHref("/explore/resources")
      : buildHref("/explore/tutorials")

  return (
    <div className="space-y-12">
      <MotionSection delay={0.4}>
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/30 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:bg-card/40">
          <div className="blur-25 pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/20" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Badge
                variant="outline"
                  className="text-2xs rounded-full border-primary/20 bg-primary/5 px-3 py-1 font-bold tracking-widest text-primary uppercase"
              >
                  {t("explore.switcher.marketplace")}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t("explore.switcher.overview")}
              </h2>
              <p className="max-w-xl text-muted-foreground">
                {t("explore.switcher.overviewDescription")}
              </p>
            </div>

            <Tabs
              value={mode}
              onValueChange={handleModeChange}
              className="w-full lg:w-auto"
            >
              <TabsList className="h-12 w-full justify-start rounded-full bg-muted/50 p-1 lg:w-auto">
                <TabsTrigger
                  value="resources"
                  className="rounded-full px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t("explore.switcher.resources")}
                </TabsTrigger>
                <TabsTrigger
                  value="tutorials"
                  className="rounded-full px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t("explore.switcher.tutorials")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </section>
      </MotionSection>

      <MotionSection delay={0.1} threshold={0.1}>
        <section className="space-y-8 rounded-3xl border border-white/5 bg-card/20 p-8 shadow-xl backdrop-blur-md transition-all duration-300">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                <Badge
                  variant="outline"
                  className="text-2xs rounded-full border-border/80 px-2 py-0.5 font-semibold tracking-widest text-muted-foreground uppercase"
                >
                  {t("explore.switcher.curated")}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold tracking-tighter">
                <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-sm">
                  {topCollectionsTitle}
                </span>
              </h3>
              <p className="max-w-2xl text-muted-foreground">
                {topCollectionsDescription}
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="hidden rounded-full border-border/80 hover:bg-accent md:flex"
              onClick={rememberExploreState}
            >
              <Link href={collectionsHref}>{t("explore.switcher.viewCollections")}</Link>
            </Button>
          </div>

          <MotionStagger
            className="grid auto-rows-fr items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.1}
          >
            {filteredCollections.length > 0 ? (
              filteredCollections.map((collection) => (
                <CollectionCard
                  key={collection.title}
                  collection={collection}
                  onClick={rememberExploreState}
                />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center text-sm text-muted-foreground">
                <p className="font-medium">{t("library.browser.noResults")}</p>
                <p className="mt-2">{t("library.browser.noResultsDescription")}</p>
              </div>
            )}
          </MotionStagger>

          <div className="flex justify-center md:hidden">
            <Button
              asChild
              variant="outline"
              className="w-full rounded-full border-border/80"
              onClick={rememberExploreState}
            >
              <Link href={collectionsHref}>{t("explore.switcher.showMore")}</Link>
            </Button>
          </div>
        </section>
      </MotionSection>

      <MotionSection delay={0.2} threshold={0.1}>
        <section className="space-y-8 rounded-3xl border border-white/5 bg-card/20 p-8 shadow-xl backdrop-blur-md transition-all duration-300">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
                <Badge
                  variant="outline"
                  className="text-2xs rounded-full border-border/80 px-2 py-0.5 font-semibold tracking-widest text-muted-foreground uppercase"
                >
                  {t("explore.switcher.popular")}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold tracking-tighter">
                <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-sm">
                  {topTitle}
                </span>
              </h3>
              <p className="max-w-2xl text-muted-foreground">
                {topDescription}
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="hidden rounded-full border-border/80 hover:bg-accent md:flex"
              onClick={rememberExploreState}
            >
              <Link href={contentHref}>
                {mode === "resources"
                  ? t("explore.switcher.viewAllResources")
                  : t("explore.switcher.viewAllTutorials")}
              </Link>
            </Button>
          </div>

          <MotionStagger
            className="grid auto-rows-fr items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.08}
          >
            {mode === "resources" ? (
              resources.length > 0 ? (
                resources.map((resource) => (
                  <ResourceCard
                    key={resource.title}
                    resource={resource}
                    onClick={rememberExploreState}
                  />
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center text-sm text-muted-foreground">
                  <p className="font-medium">{t("library.browser.noResults")}</p>
                  <p className="mt-2">{t("library.browser.noResultsDescription")}</p>
                </div>
              )
            ) : tutorials.length > 0 ? (
              tutorials.map((tutorial) => (
                <TutorialCard
                  key={tutorial.title}
                  tutorial={tutorial}
                  onClick={rememberExploreState}
                />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center text-sm text-muted-foreground">
                <p className="font-medium">{t("library.browser.noResults")}</p>
                <p className="mt-2">{t("library.browser.noResultsDescription")}</p>
              </div>
            )}
          </MotionStagger>

          <div className="flex justify-center md:hidden">
            <Button
              asChild
              variant="outline"
              className="w-full rounded-full border-border/80"
              onClick={rememberExploreState}
            >
              <Link href={contentHref}>{t("explore.switcher.showMore")}</Link>
            </Button>
          </div>
        </section>
      </MotionSection>
    </div>
  )
}
