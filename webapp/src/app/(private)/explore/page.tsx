import { Suspense } from "react"

import type { Metadata } from "next"

import { ExploreHero } from "@/features/content"
import { ExploreModeSwitcher } from "@/features/content"
import { RecommendationSection } from "@/features/content"
import { TrendingSection } from "@/features/content"
import {
  getResourceCollections,
  getResources,
  mapCollectionToCard,
  mapResourceToCard,
  mapTutorialToCard,
} from "@/features/content"
import {
  getTopResourceCollections,
  getTopResources,
  getTopTutorialCollections,
  getTopTutorials,
  getTutorialCollections,
  getTutorials,
} from "@/features/content"
import { CollectionType } from "@/features/content"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"


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
  const courseId =
    typeof searchParams.courseId === "string" ? searchParams.courseId : undefined
  const verified = searchParams.verified === "true" ? true : undefined
  const sort =
    searchParams.sort === "popular" || searchParams.sort === "rating"
      ? searchParams.sort
      : undefined
  const hasActiveFilters = Boolean(
    search || semester || majorId || courseId || verified !== undefined || sort
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"

  const [{ t }, seo, tutsData, resData, tutColsData, resColsData] =
    await Promise.all([
      getServerTranslator(),
      seoPromise,
      hasActiveFilters
        ? getTutorials({
            page: 1,
            limit: 6,
            semester,
            majorId,
            courseId,
            search,
            verified,
            sort,
          }).then((result) => result.data)
        : getTopTutorials(6, search, semester, majorId),
      hasActiveFilters
        ? getResources({
            page: 1,
            limit: 6,
            semester,
            majorId,
            courseId,
            search,
            verified,
            sort,
          }).then((result) => result.data)
        : getTopResources(6, search, semester, majorId),
      hasActiveFilters
        ? getTutorialCollections({
            page: 1,
            limit: 3,
            search,
            courseId,
          }).then((result) => result.data)
        : getTopTutorialCollections(3, search, semester, majorId),
      hasActiveFilters
        ? getResourceCollections({
            page: 1,
            limit: 3,
            search,
            courseId,
          }).then((result) => result.data)
        : getTopResourceCollections(3, search, semester, majorId),
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
      { "@type": "ListItem", position: 1, name: t("nav.home"), item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: t("nav.explore"),
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
      <ExploreHero />

      {!hasActiveFilters ? <TrendingSection majorId={majorId} limit={6} /> : null}
      {!hasActiveFilters ? <RecommendationSection pageSize={6} /> : null}

      <Suspense>
        <ExploreModeSwitcher
          collections={collections}
          resources={resources}
          tutorials={tutorials}
          isFiltered={hasActiveFilters}
        />
      </Suspense>
    </section>
  )
}
