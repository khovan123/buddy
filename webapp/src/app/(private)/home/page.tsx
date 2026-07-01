import type { Metadata } from "next"

import { HomeModeSwitcher } from "@/features/content"
import { TrendingSection } from "@/features/content"
import {
  HomeOverviewSections,
  mapCollectionToCard,
  mapResourceToCard,
  mapTutorialToCard,
} from "@/features/content"
import {
  getTopResourceCollections,
  getTopResources,
  getTopTutorialCollections,
  getTopTutorials,
} from "@/features/content"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("home")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/home",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/home",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function HomePage() {
  const [
    seo,
    { t },
    topResources,
    topTutorials,
    topResourceCollections,
    topTutorialCollections,
  ] = await Promise.all([
    getSeoContent("home"),
    getServerTranslator(),
    getTopResources(6),
    getTopTutorials(6),
    getTopResourceCollections(3),
    getTopTutorialCollections(3),
  ])

  const resources = topResources.map(mapResourceToCard)
  const tutorials = topTutorials.map(mapTutorialToCard)
  const resourceCollections = topResourceCollections.map((c) =>
    mapCollectionToCard(c, "resource")
  )
  const tutorialCollections = topTutorialCollections.map((c) =>
    mapCollectionToCard(c, "tutorial")
  )

  return (
    <section className="space-y-14">
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/home",
          }),
          breadcrumbJsonLd([{ name: t("nav.home"), path: "/home" }]),
        ]}
      />
      <HomeOverviewSections />

      <TrendingSection limit={3} />

      <HomeModeSwitcher
        resourceCollections={resourceCollections}
        tutorialCollections={tutorialCollections}
        resources={resources}
        tutorials={tutorials}
      />
    </section>
  )
}
