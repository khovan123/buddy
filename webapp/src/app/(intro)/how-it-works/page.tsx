import type { Metadata } from "next"

import { HowItWorksContent } from "@/features/intro/components/how-it-works-content"
import { getHowItWorksData } from "@/features/intro/services/intro.service"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  howToJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("how-it-works")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/how-it-works",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/how-it-works",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function HowItWorksPage() {
  const [seo, data] = await Promise.all([
    getSeoContent("how-it-works"),
    getHowItWorksData(),
  ])

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/how-it-works",
          }),
          howToJsonLd({
            name: "How to Learn on Buddy",
            description:
              "Step-by-step guide for students to discover, learn, and organize educational content on Buddy.",
            steps: data.learnerSteps.map((s) => ({
              name: s.title,
              text: s.description,
            })),
          }),
          howToJsonLd({
            name: "How to Create Content on Buddy",
            description:
              "Step-by-step guide for creators to build, monetize, and track educational content on Buddy.",
            steps: data.creatorSteps.map((s) => ({
              name: s.title,
              text: s.description,
            })),
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "How It Works", path: "/how-it-works" },
          ]),
        ]}
      />
      <HowItWorksContent data={data} />
    </>
  )
}
