import type { Metadata } from "next"

import { CreateTutorialForm } from "@/features/content"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("create-tutorial")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/home/tutorials/create",
    },
    robots: { index: false },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/home/tutorials/create",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function CreateTutorialPage() {
  const seo = await getSeoContent("create-tutorial")

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/home/tutorials/create",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Create Tutorial", path: "/home/tutorials/create" },
          ]),
        ]}
      />
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Content Creator
          </h1>
          <p className="mt-2 text-muted-foreground">{seo.description}</p>
        </div>
        <CreateTutorialForm />
      </div>
    </>
  )
}
