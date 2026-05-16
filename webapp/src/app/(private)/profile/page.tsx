import type { Metadata } from "next"

import { ProfileHeroSection } from "@/components/organisms/profile-hero-section"
import { ProfilePublishedSection } from "@/components/organisms/profile-published-section"
import { fetchProfileTab } from "@/features/content/actions/actions"
import { mapTutorialToProfileItem } from "@/features/content/mappers"
import {
  getMyTutorials,
  getMyResources,
  getMyTutorialCollections,
  getMyResourceCollections,
} from "@/features/content/services/content.service"
import type { TutorialQueryItem, ResourceQueryItem, CollectionQueryItem } from "@/features/content/types"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { ProfileSettingsCard } from "@/features/user/components/profile-settings-card"
import { getCreatorStats, getMe } from "@/features/user/services/user.service"


export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("profile")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/profile",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/profile",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function ProfilePage() {
  const seo = await getSeoContent("profile")

  const emptyTutorials = {
    data: [] as TutorialQueryItem[],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  }
  const emptyResources = {
    data: [] as ResourceQueryItem[],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  }
  const emptyCols = {
    data: [] as CollectionQueryItem[],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  }

  // Fetch user info first (needed for stats userId), then parallel-fetch the rest
  const me = await getMe()

  const [tuts, resData, tutCols, resCols, stats] = await Promise.all([
    getMyTutorials().catch(() => emptyTutorials),
    getMyResources().catch(() => emptyResources),
    getMyTutorialCollections().catch(() => emptyCols),
    getMyResourceCollections().catch(() => emptyCols),
    me ? getCreatorStats(me.id).catch(() => null) : Promise.resolve(null),
  ])

  const initialItems = (tuts.data || []).map(mapTutorialToProfileItem)

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: "Personal Profile",
            description: seo.description,
            url: "/profile",
            type: "ProfilePage",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Profile", path: "/profile" },
          ]),
        ]}
      />
      <section className="space-y-14 pb-10">
        <ProfileHeroSection seoBadge={seo.badge} me={me} stats={stats} />
        <ProfileSettingsCard user={me} />
        <ProfilePublishedSection
          initialItems={initialItems}
          initialCounts={{
            tutorials: tuts.meta.total,
            resources: resData.meta.total,
            collections: tutCols.meta.total + resCols.meta.total,
          }}
          fetchTab={fetchProfileTab}
        />
      </section>
    </>
  )
}

