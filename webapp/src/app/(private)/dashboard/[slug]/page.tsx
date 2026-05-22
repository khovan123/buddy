import { Metadata } from "next"

import { notFound } from "next/navigation"

import { ContentDashboardView } from "@/features/dashboard"
import { getSeoContent } from "@/features/seo/services/seo-content"

interface DashboardSlugPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: DashboardSlugPageProps): Promise<Metadata> {
  const { slug } = await params
  const validSlugs = ["majors", "courses", "careers", "skills", "tutorials", "resources", "collections"]
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

  const validSlugs = ["majors", "courses", "careers", "skills", "tutorials", "resources", "collections"]
  if (!validSlugs.includes(slug)) {
    notFound()
  }

  const seo = await getSeoContent("dashboard")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://unibuddy.app"

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Dashboard",
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
      <ContentDashboardView seo={seo} slug={slug} />
    </>
  )
}
