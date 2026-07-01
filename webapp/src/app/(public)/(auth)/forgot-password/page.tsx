import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("auth-forgot-password")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/forgot-password",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/forgot-password",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function ForgotPasswordPage() {
  const [seo, { t }] = await Promise.all([
    getSeoContent("auth-forgot-password"),
    getServerTranslator(),
  ])

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/forgot-password",
          }),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/" },
            { name: seo.badge, path: "/forgot-password" },
          ]),
        ]}
      />
      <ForgotPasswordForm />
    </>
  )
}
