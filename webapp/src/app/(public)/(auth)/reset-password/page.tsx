import type { Metadata } from "next"

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("auth-reset-password")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/reset-password",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/reset-password",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function ResetPasswordPage() {
  const [seo, { t }] = await Promise.all([
    getSeoContent("auth-reset-password"),
    getServerTranslator(),
  ])

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/reset-password",
          }),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/" },
            { name: seo.badge, path: "/reset-password" },
          ]),
        ]}
      />
      <ResetPasswordForm />
    </>
  )
}
