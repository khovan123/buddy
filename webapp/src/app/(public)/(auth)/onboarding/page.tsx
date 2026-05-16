import type { Metadata } from "next"

import { OnboardingForm } from "@/features/auth/components/onboarding-form"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("onboarding")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/onboarding",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/onboarding",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function OnboardingPage() {
  const seo = await getSeoContent("onboarding")

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/onboarding",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Onboarding", path: "/onboarding" },
          ]),
        ]}
      />
      <OnboardingForm />
    </>
  )
}
