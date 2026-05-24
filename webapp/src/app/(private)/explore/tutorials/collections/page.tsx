import type { Metadata } from "next"

import { CollectionCard } from "@/components/molecules/collection-card"
import { CollectionLoadMoreGrid } from "@/features/content"
import { RecommendationSection } from "@/features/content"
import { mapCollectionToCard } from "@/features/content"
import {
  getTopTutorialCollections,
  getTutorialCollections,
} from "@/features/content"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("explore-tutorials-collections")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/explore/tutorials/collections",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/explore/tutorials/collections",
      type: "website",
    },
  }
}

export default async function ExploreTutorialCollectionsPage() {
  const [seo, result, topItems] = await Promise.all([
    getSeoContent("explore-tutorials-collections"),
    getTutorialCollections({ page: 1, limit: 20 }),
    getTopTutorialCollections(6),
  ])
  const collections = result.data.map((c) => mapCollectionToCard(c, "tutorial"))
  const featuredCollections = topItems.map((c) =>
    mapCollectionToCard(c, "tutorial")
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://unibuddy.app"

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
      {
        "@type": "ListItem",
        position: 3,
        name: "Tutorials",
        item: `${siteUrl}/explore/tutorials`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Collections",
        item: `${siteUrl}/explore/tutorials/collections`,
      },
    ],
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo.title,
    description: seo.description,
    numberOfItems: result.meta.total,
    itemListElement: collections.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      url: `${siteUrl}${item.href}`,
    })),
  }

  return (
    <section className="space-y-10 pb-12">
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
      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          {seo.badge}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {seo.title}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {seo.description}
        </p>
      </header>

      <div className="pt-2 pb-6">
        <RecommendationSection
          pageSize={6}
          contentType="TUTORIAL_COLLECTION"
          hasLoadMore={true}
        />
      </div>

      {featuredCollections ? (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Top Tutorial Collection
              </h2>
              <p className="text-sm text-muted-foreground">
                Featured learning path for this week.
              </p>
            </div>
          </div>

          <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredCollections.length > 0 &&
              featuredCollections.map((featuredCollection) => (
                <CollectionCard
                  collection={featuredCollection}
                  key={`feature-${featuredCollection.id}`}
                />
              ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              All Tutorial Collections
            </h2>
            <p className="text-sm text-muted-foreground">
              Browse the rest of the tutorial collections below.
            </p>
          </div>
        </div>

        <CollectionLoadMoreGrid
          initialItems={collections}
          initialMeta={result.meta}
          collectionType="tutorial"
        />
      </section>
    </section>
  )
}
