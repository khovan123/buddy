import type { Metadata } from "next"

import { ContactContent } from "@/features/intro/components/contact-content"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("contact")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/contact",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/contact",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function ContactPage() {
  const seo = await getSeoContent("contact")

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/contact",
            type: "ContactPage",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />
      <ContactContent />
    </>
  )
}
