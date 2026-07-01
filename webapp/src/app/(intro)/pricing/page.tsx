import type { Metadata } from "next"

import { PricingContent } from "@/features/intro/components/pricing-content"
import { getPricingData } from "@/features/intro/services/intro.service"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  faqPageJsonLd,
  productWithOffersJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("pricing")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/pricing",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/pricing",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function PricingPage() {
  const [seo, data, { t }] = await Promise.all([
    getSeoContent("pricing"),
    getPricingData(),
    getServerTranslator(),
  ])

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/pricing",
          }),
          productWithOffersJsonLd({
            name: "Buddy Education Platform",
            description: seo.description,
            url: "/pricing",
            offers: [
              {
                name: data.creatorPlans.free.label,
                price: data.creatorPlans.free.price,
                description: data.creatorPlans.free.description,
              },
              {
                name: data.creatorPlans.pro.label,
                price: data.creatorPlans.pro.price,
                description: data.creatorPlans.pro.description,
              },
              {
                name: data.studentPlans.free.label,
                price: data.studentPlans.free.price,
                description: data.studentPlans.free.description,
              },
              {
                name: data.studentPlans.pro.label,
                price: data.studentPlans.pro.price,
                description: data.studentPlans.pro.description,
              },
            ],
          }),
          faqPageJsonLd(data.faqItems),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/" },
            { name: t("intro.nav.pricing"), path: "/pricing" },
          ]),
        ]}
      />
      <PricingContent data={data} />
    </>
  )
}
