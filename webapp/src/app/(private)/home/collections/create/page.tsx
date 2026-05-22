import type { Metadata } from "next"

import { CreateCollectionForm } from "@/features/content"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("create-collection")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/home/collections/create",
    },
    robots: { index: false },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/home/collections/create",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function CreateCollectionPage() {
  const seo = await getSeoContent("create-collection")

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/home/collections/create",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Create Collection", path: "/home/collections/create" },
          ]),
        ]}
      />
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Collection Creator
          </h1>
          <p className="mt-2 text-muted-foreground">{seo.description}</p>
        </div>
        <CreateCollectionForm />
      </div>
    </>
  )
}
