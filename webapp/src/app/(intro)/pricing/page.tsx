import type { Metadata } from "next"

import { centsToMajorUnit } from "@/features/billing/types/billing-types"
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

  const jsonLd = [
    webPageJsonLd({
      name: seo.title,
      description: seo.description,
      url: "/pricing",
    }),
    breadcrumbJsonLd([
      { name: t("nav.home"), path: "/" },
      { name: t("intro.nav.pricing"), path: "/pricing" },
    ]),
  ]

  if (data) {
    jsonLd.push(
      productWithOffersJsonLd({
        name: "Buddy Education Platform",
        description: seo.description,
        url: "/pricing",
        offers: [
          {
            name: data.creatorPlans.free.label,
            price: centsToMajorUnit(data.creatorPlans.free.priceInCents),
            priceCurrency: data.creatorPlans.free.currency,
            description: data.creatorPlans.free.description,
          },
          {
            name: data.creatorPlans.pro.label,
            price: centsToMajorUnit(data.creatorPlans.pro.priceInCents),
            priceCurrency: data.creatorPlans.pro.currency,
            description: data.creatorPlans.pro.description,
          },
          {
            name: data.studentPlans.free.label,
            price: centsToMajorUnit(data.studentPlans.free.priceInCents),
            priceCurrency: data.studentPlans.free.currency,
            description: data.studentPlans.free.description,
          },
          {
            name: data.studentPlans.pro.label,
            price: centsToMajorUnit(data.studentPlans.pro.priceInCents),
            priceCurrency: data.studentPlans.pro.currency,
            description: data.studentPlans.pro.description,
          },
        ],
      }),
      faqPageJsonLd(data.faqItems)
    )
  }

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <PricingContent data={data} />
    </>
  )
}
