import type { Metadata } from "next"

import { MetaChip } from "@/components/atoms/meta-chip"
import { SectionHeading } from "@/components/atoms/section-heading"
import { SeoHero } from "@/components/molecules/seo-hero"
import { ProfilePublishedSection } from "@/components/organisms/profile-published-section"
import { fetchUserProfileTab } from "@/features/content"
import { mapTutorialToProfileItem } from "@/features/content"
import { getTutorials } from "@/features/content"
import type { TutorialQueryItem } from "@/features/content"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"


type PageParams = Promise<{ id: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent(`profile-${(await params).id}`),
  ])
  const canonical = `/profile/${id}`

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: "profile",
    },
  }
}

export default async function ProfileDetailPage({
  params,
}: {
  params: PageParams
}) {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent(`profile-${(await params).id}`),
  ])

  const emptyTutorials = {
    data: [] as TutorialQueryItem[],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  }

  // Only fetch tutorials (default tab) server-side
  const tuts = await getTutorials({ userId: id }).catch(() => emptyTutorials)
  const initialItems = (tuts.data || []).map(mapTutorialToProfileItem)

  // Bind userId to the server action for lazy tab loading
  const fetchTab = fetchUserProfileTab.bind(null, id)

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: `/profile/${id}`,
            type: "ProfilePage",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Profile", path: `/profile/${id}` },
          ]),
        ]}
      />
      <section className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Profile Detail
        </h1>
        <SeoHero
          badge={seo.badge}
          title={seo.title}
          description={seo.description}
          primaryCta="Follow creator"
          secondaryCta="Send message"
        />
        <SectionHeading
          badge="Highlights"
          title="Creator details"
          description="Content is regenerated on an ISR cycle for better discovery and indexing."
        />
        <div className="flex flex-wrap gap-2">
          <MetaChip>id: {id}</MetaChip>
          <MetaChip>12 courses</MetaChip>
          <MetaChip>4.9 rating</MetaChip>
        </div>
        <ProfilePublishedSection
          initialItems={initialItems}
          initialCounts={{
            tutorials: tuts.meta.total,
            resources: 0,
            collections: 0,
          }}
          fetchTab={fetchTab}
        />
      </section>
    </>
  )
}
