import { Suspense } from "react"

import type { Metadata } from "next"

import { ExploreHero } from "@/features/content"
import { ExploreModeSwitcher } from "@/features/content"
import { RecommendationSection } from "@/features/content"
import { TrendingSection } from "@/features/content"
import {
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
import { CollectionType } from "@/features/content"
import { getSeoContent } from "@/features/seo/services/seo-content"


export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("explore")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/explore",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/explore",
      type: "website",
    },
  }
}

export default async function ExplorePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const seoPromise = getSeoContent("explore")
  const searchParams = await props.searchParams
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined
  const semester =
    typeof searchParams.semester === "string"
      ? Number(searchParams.semester)
      : undefined
  const majorId =
    typeof searchParams.majorId === "string" ? searchParams.majorId : undefined

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"

  const [seo, tutsData, resData, tutColsData, resColsData] = await Promise.all([
    seoPromise,
    getTopTutorials(6, search, semester, majorId),
    getTopResources(6, search, semester, majorId),
    getTopTutorialCollections(6, search, semester, majorId),
    getTopResourceCollections(6, search, semester, majorId),
  ])

  const collectionsData = [...tutColsData, ...resColsData]

  const collections = collectionsData.map((item) => {
    const isTutorial = item.type === CollectionType.TUTORIAL
    return {
      ...mapCollectionToCard(item, isTutorial ? "tutorial" : "resource"),
      mode: (isTutorial ? "tutorials" : "resources") as
        | "resources"
        | "tutorials",
    }
  })

  const resources = resData.map(mapResourceToCard)
  const tutorials = tutsData.map(mapTutorialToCard)

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Explore",
        item: `${siteUrl}/explore`,
      },
    ],
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo.title,
    description: seo.description,
    numberOfItems: collections.length + resources.length + tutorials.length,
    itemListElement: collections.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      url: `${siteUrl}${item.href}`,
    })),
  }

  return (
    <section className="space-y-10">
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <ExploreHero
        badge={seo.badge}
        title={seo.title}
        description={seo.description}
      />

      <TrendingSection majorId={majorId} limit={6} />
      <RecommendationSection pageSize={6} />

      <Suspense>
        <ExploreModeSwitcher
          collections={collections}
          resources={resources}
          tutorials={tutorials}
        />
      </Suspense>
    </section>
  )
}
