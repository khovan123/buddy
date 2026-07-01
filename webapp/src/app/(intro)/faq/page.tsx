import type { Metadata } from "next"

import { FaqContent } from "@/features/intro/components/faq-content"
import { getFaqPageData } from "@/features/intro/services/intro.service"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  faqPageJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("faq")

  return {
    title: seo?.title ?? "FAQ | Buddy",
    description:
      seo?.description ??
      "Frequently asked questions about Buddy's platform, subscriptions, and creator tools.",
    alternates: {
      canonical: "/faq",
    },
    openGraph: {
      title: seo?.title ?? "FAQ | Buddy",
      description:
        seo?.description ??
        "Frequently asked questions about Buddy's platform, subscriptions, and creator tools.",
      url: "/faq",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.title ?? "FAQ | Buddy",
      description:
        seo?.description ??
        "Frequently asked questions about Buddy's platform, subscriptions, and creator tools.",
    },
  }
}

export default async function FaqPage() {
  const [seo, data, { t }] = await Promise.all([
    getSeoContent("faq"),
    getFaqPageData(),
    getServerTranslator(),
  ])

  // Flatten all FAQ categories into a single Q&A list for FAQPage schema
  const allFaqs = data.categories.flatMap((cat) => cat.faqs)

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/faq",
          }),
          faqPageJsonLd(allFaqs),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/" },
            { name: t("intro.nav.faq"), path: "/faq" },
          ]),
        ]}
      />
      <FaqContent data={data} />
    </>
  )
}
