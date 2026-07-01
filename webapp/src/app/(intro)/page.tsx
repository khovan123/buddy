import type { Metadata } from "next"

import { LandingContent } from "@/features/intro/components/landing-content"
import { getLandingData } from "@/features/intro/services/intro.service"
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
      canonical: "/",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function Page() {
  const [seo, data, { t }] = await Promise.all([
    getSeoContent("home"),
    getLandingData(),
    getServerTranslator(),
  ])

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/",
          }),
          breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }]),
        ]}
      />
      <LandingContent seoDescription={seo.description} data={data} />
    </>
  )
}
