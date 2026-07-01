import type { Metadata } from "next"

import { MetaChip } from "@/components/atoms/meta-chip"
import { SectionHeading } from "@/components/atoms/section-heading"
import { SeoHero } from "@/components/molecules/seo-hero"
import { ProfilePublishedSection } from "@/components/organisms/profile-published-section"
import {
  getAuthVerification,
  isAuthVerified,
} from "@/features/auth/services/auth.service"
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
import { getServerTranslator } from "@/i18n/server"


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
  const { t } = await getServerTranslator()

  const emptyTutorials = {
    data: [] as TutorialQueryItem[],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  }

  // Only fetch tutorials (default tab) server-side
  const [tuts, authVerification] = await Promise.all([
    getTutorials({ userId: id }).catch(() => emptyTutorials),
    getAuthVerification(id).catch(() => null),
  ])
  const initialItems = (tuts.data || []).map(mapTutorialToProfileItem)
  const verified = isAuthVerified(authVerification)

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
            { name: t("nav.home"), path: "/home" },
            { name: t("nav.profile"), path: `/profile/${id}` },
          ]),
        ]}
      />
      <section className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("profile.detail.title")}
        </h1>
        <SeoHero
          badge={seo.badge}
          title={seo.title}
          description={seo.description}
          primaryCta={t("profile.detail.primaryCta")}
          secondaryCta={t("profile.detail.secondaryCta")}
        />
        <SectionHeading
          badge={t("profile.detail.badge")}
          title={t("profile.detail.sectionTitle")}
          description={t("profile.detail.sectionDescription")}
        />
        <div className="flex flex-wrap gap-2">
          <MetaChip>id: {id}</MetaChip>
          {verified ? <MetaChip>{t("profile.detail.verified")}</MetaChip> : null}
          <MetaChip>{t("profile.detail.courses")}</MetaChip>
          <MetaChip>{t("profile.detail.rating")}</MetaChip>
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
