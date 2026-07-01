import type { Metadata } from "next"

import { AboutContent } from "@/features/intro/components/about-content"
import { getAboutData } from "@/features/intro/services/intro.service"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("about")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/about",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/about",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function AboutPage() {
  const [seo, data, { t }] = await Promise.all([
    getSeoContent("about"),
    getAboutData(),
    getServerTranslator(),
  ])

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/about",
            type: "AboutPage",
          }),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/" },
            { name: t("intro.nav.about"), path: "/about" },
          ]),
        ]}
      />
      <AboutContent data={data} />
    </>
  )
}
