import { Metadata } from "next"

import { notFound } from "next/navigation"

import {
  ContentDashboardView,
  ModerationSettingsDashboard,
  PlanLimitsDashboard,
  getModerationSettings,
  getSubscriptionPlanCatalog,
} from "@/features/dashboard"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

interface DashboardSlugPageProps {
  params: Promise<{ slug: string }>
}

const validSlugs = [
  "majors",
  "courses",
  "careers",
  "skills",
  "plans",
  "moderation",
]

export async function generateMetadata({
  params,
}: DashboardSlugPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!validSlugs.includes(slug)) {
    return {}
  }

  const seo = await getSeoContent("dashboard")

  return {
    title: `${seo.title} - ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
    description: seo.description,
    alternates: {
      canonical: `/dashboard/${slug}`,
    },
    openGraph: {
      title: `${seo.title} - ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
      description: seo.description,
      url: `/dashboard/${slug}`,
      type: "website",
    },
  }
}

export default async function DashboardSlugPage({
  params,
}: DashboardSlugPageProps) {
  const { slug } = await params

  if (!validSlugs.includes(slug)) {
    notFound()
  }

  const [seo, { t }] = await Promise.all([
    getSeoContent("dashboard"),
    getServerTranslator(),
  ])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("nav.home"), item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: t("nav.dashboard"),
        item: `${siteUrl}/dashboard/${slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {slug === "plans" ? (
        <PlanLimitsDashboard plans={await getSubscriptionPlanCatalog()} />
      ) : slug === "moderation" ? (
        <ModerationSettingsDashboard settings={await getModerationSettings()} />
      ) : (
        <ContentDashboardView seo={seo} slug={slug} />
      )}
    </>
  )
}
