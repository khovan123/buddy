"use client"

import { useState } from "react"

import Link from "next/link"

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
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/i18n/language-provider"

type HomeMode = "resources" | "tutorials"

type HomeModeSwitcherProps = {
  resourceCollections: CollectionCardData[]
  tutorialCollections: CollectionCardData[]
  resources: ResourceCardData[]
  tutorials: TutorialCardData[]
}

export function HomeModeSwitcher({
  resourceCollections,
  tutorialCollections,
  resources,
  tutorials,
}: HomeModeSwitcherProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<HomeMode>("resources")

  const copy = {
    topCollectionsTitle: {
      resources: t("home.switcher.resourceCollectionsTitle"),
      tutorials: t("home.switcher.tutorialCollectionsTitle"),
    },
    topCollectionsDescription: {
      resources: t("home.switcher.resourceCollectionsDescription"),
      tutorials: t("home.switcher.tutorialCollectionsDescription"),
    },
    trendingTitle: {
      resources: t("home.switcher.resourceTitle"),
      tutorials: t("home.switcher.tutorialTitle"),
    },
    trendingDescription: {
      resources: t("home.switcher.resourceDescription"),
      tutorials: t("home.switcher.tutorialDescription"),
    },
    overview: t("home.switcher.overview"),
    overviewDescription: t("home.switcher.overviewDescription"),
    resources: t("home.switcher.resources"),
    tutorials: t("home.switcher.tutorials"),
    exploreAll: t("home.switcher.exploreAll"),
    showMore: t("home.switcher.showMore"),
  }
  const topCollectionsTitle = copy.topCollectionsTitle[mode]
  const topCollectionsDescription = copy.topCollectionsDescription[mode]
  const trendingTitle = copy.trendingTitle[mode]
  const trendingDescription = copy.trendingDescription[mode]

  const collectionsHref =
    mode === "resources"
      ? "/explore/resources/collections"
      : "/explore/tutorials/collections"
  const contentHref =
    mode === "resources" ? "/explore/resources" : "/explore/tutorials"

  const activeCollections =
    mode === "resources" ? resourceCollections : tutorialCollections

  return (
    <div className="space-y-8">
      <section className="space-y-6 rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
              {copy.overview}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {copy.overviewDescription}
            </p>
          </div>

          <Tabs
            value={mode}
            onValueChange={(value) =>
              setMode(value === "tutorials" ? "tutorials" : "resources")
            }
            className="w-full lg:w-auto"
          >
            <TabsList className="w-full justify-start bg-muted lg:w-auto">
              <TabsTrigger value="resources">{copy.resources}</TabsTrigger>
              <TabsTrigger value="tutorials">{copy.tutorials}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {topCollectionsTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {topCollectionsDescription}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={collectionsHref}>{copy.exploreAll}</Link>
          </Button>
        </div>

        <div className="grid auto-rows-fr items-stretch gap-4 lg:grid-cols-3">
          {activeCollections.map((collection) => (
            <CollectionCard
              key={collection.title}
              collection={collection}
              imageSizes="(max-width: 1024px) 100vw, 33vw"
            />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {trendingTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {trendingDescription}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={contentHref}>{copy.exploreAll}</Link>
          </Button>
        </div>

        <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mode === "resources"
            ? resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))
            : tutorials.map((tutorial) => (
                <TutorialCard key={tutorial.id} tutorial={tutorial} />
              ))}
        </div>

        <div className="flex justify-center pt-2">
          <Button asChild variant="outline">
            <Link href={contentHref}>{copy.showMore}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
