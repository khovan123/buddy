import type { Metadata } from "next"

import { OtpForm } from "@/features/auth/components/otp-form"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("auth-otp")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/otp",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/otp",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function OtpPage() {
  const [seo, { t }] = await Promise.all([
    getSeoContent("auth-otp"),
    getServerTranslator(),
  ])

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/otp",
          }),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/" },
            { name: seo.badge, path: "/otp" },
          ]),
        ]}
      />
      <OtpForm />
    </>
  )
}
