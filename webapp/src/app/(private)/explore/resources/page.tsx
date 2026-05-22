import type { Metadata } from "next"

import Link from "next/link"

import { ResourceCard } from "@/components/molecules/resource-card"
import { Button } from "@/components/ui/button"
import { RecommendationSection } from "@/features/content"
import { ResourceLoadMoreGrid } from "@/features/content"
import { mapResourceToCard } from "@/features/content"
import {
  getResources,
  getTopResources,
} from "@/features/content"
import { getSeoContent } from "@/features/seo/services/seo-content"



export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("explore-resources")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/explore/resources",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/explore/resources",
      type: "website",
    },
  }
}

export default async function ExploreResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const seoPromise = getSeoContent("explore-resources")
  const params = await searchParams
  const semester = params.semester ? Number(params.semester) : undefined
  const majorId =
    typeof params.majorId === "string" ? params.majorId : undefined
  const search = typeof params.search === "string" ? params.search : undefined

  const [seo, result, topItems] = await Promise.all([
    seoPromise,
    getResources({
      page: 1,
      limit: 20,
      semester,
      majorId,
      search,
    }),
    getTopResources(6, search, semester, majorId),
  ])
  const resources = result.data.map(mapResourceToCard)
  const featuredResources = topItems.map(mapResourceToCard)

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
        name: "Resources",
        item: `${siteUrl}/explore/resources`,
      },
    ],
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo.title,
    description: seo.description,
    numberOfItems: result.meta.total,
    itemListElement: resources.map((item, index) => ({
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
        <RecommendationSection pageSize={3} contentType="RESOURCE" />
      </div>

      {featuredResources.length > 0 ? (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Top Resources
              </h2>
              <p className="text-sm text-muted-foreground">
                Featured recommendation for this week.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/explore/resources/collections">
                View Collections
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredResources.map((featuredResource) => (
              <ResourceCard
                resource={featuredResource}
                key={`feature-${featuredResource.id}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              All Resources
            </h2>
            <p className="text-sm text-muted-foreground">
              Browse the rest of the collection below.
            </p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {result.meta.total} resources
          </p>
        </div>

        <ResourceLoadMoreGrid
          initialItems={resources}
          initialMeta={result.meta}
          filters={{ semester, majorId, search }}
        />
      </section>
    </section>
  )
}
