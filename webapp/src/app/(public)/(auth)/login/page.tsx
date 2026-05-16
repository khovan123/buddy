import type { Metadata } from "next"

import { LoginForm } from "@/features/auth/components/login-form"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("auth-login")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/login",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/login",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function LoginPage() {
  const seo = await getSeoContent("auth-login")

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/login",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Login", path: "/login" },
          ]),
        ]}
      />
      <LoginForm />
    </>
  )
}
