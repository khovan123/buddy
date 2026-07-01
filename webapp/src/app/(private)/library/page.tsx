import type { Metadata } from "next"

import type {
  CollectionQueryItem,
  ResourceQueryItem,
  TutorialQueryItem,
} from "@/features/content"
import {
  RecommendationSection,
  getLibraryResourceCollections,
  getLibraryResources,
  getLibraryTutorialCollections,
  getLibraryTutorials,
  mapCollectionToLibraryCard,
  mapResourceToLibraryAsset,
  mapTutorialToLibraryAsset,
} from "@/features/content"
import LibraryBrowser from "@/features/library/components/library-browser"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"
import { getServerTranslator } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("library")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/library",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/library",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function LibraryPage() {
  const [seo, { t }] = await Promise.all([
    getSeoContent("library"),
    getServerTranslator(),
  ])

  const [resources, tutorials, resourceCollections, tutorialCollections] =
    await Promise.all([
      getLibraryResources({}).catch(() => ({
        data: [] as ResourceQueryItem[],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })),
      getLibraryTutorials({}).catch(() => ({
        data: [] as TutorialQueryItem[],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })),
      getLibraryResourceCollections({}).catch(() => ({
        data: [] as CollectionQueryItem[],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })),
      getLibraryTutorialCollections({}).catch(() => ({
        data: [] as CollectionQueryItem[],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })),
    ])

  const catalog = {
    resources: (resources.data || []).map(mapResourceToLibraryAsset),
    tutorials: (tutorials.data || []).map(mapTutorialToLibraryAsset),
    resourceCollections: (resourceCollections.data || []).map((c) =>
      mapCollectionToLibraryCard(c, "resource")
    ),
    tutorialCollections: (tutorialCollections.data || []).map((c) =>
      mapCollectionToLibraryCard(c, "tutorial")
    ),
  }

  return (
    <>
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/library",
          }),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/home" },
            { name: t("nav.library"), path: "/library" },
          ]),
        ]}
      />
      <LibraryBrowser
        catalog={catalog}
      />
      <div className="mt-10">
        <RecommendationSection pageSize={3} />
      </div>
    </>
  )
}
