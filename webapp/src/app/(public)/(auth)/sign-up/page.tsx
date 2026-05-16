import type { Metadata } from "next"

import { SignUpForm } from "@/features/auth/components/sign-up-form"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("auth-sign-up")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/sign-up",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/sign-up",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function SignUpPage() {
  const seo = await getSeoContent("auth-sign-up")

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/sign-up",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Sign Up", path: "/sign-up" },
          ]),
        ]}
      />
      <SignUpForm />
    </>
  )
}
