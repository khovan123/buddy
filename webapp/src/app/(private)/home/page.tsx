import type { Metadata } from "next"

import { SectionHeading } from "@/components/atoms/section-heading"
import { FeatureCard } from "@/components/molecules/feature-card"
import { SeoHero } from "@/components/molecules/seo-hero"
import { HomeModeSwitcher } from "@/features/content"
import { TrendingSection } from "@/features/content"
import {
  mapCollectionToCard,
  mapResourceToCard,
  mapTutorialToCard,
} from "@/features/content"
import {
  getTopResourceCollections,
  getTopResources,
  getTopTutorialCollections,
  getTopTutorials,
} from "@/features/content"
import {
  JsonLdScript,
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/seo/components/json-ld"
import { getSeoContent } from "@/features/seo/services/seo-content"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoContent("home")

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: "/home",
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: "/home",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function HomePage() {
  const [
    seo,
    topResources,
    topTutorials,
    topResourceCollections,
    topTutorialCollections,
  ] = await Promise.all([
    getSeoContent("home"),
    getTopResources(6),
    getTopTutorials(6),
    getTopResourceCollections(3),
    getTopTutorialCollections(3),
  ])

  const resources = topResources.map(mapResourceToCard)
  const tutorials = topTutorials.map(mapTutorialToCard)
  const resourceCollections = topResourceCollections.map((c) =>
    mapCollectionToCard(c, "resource")
  )
  const tutorialCollections = topTutorialCollections.map((c) =>
    mapCollectionToCard(c, "tutorial")
  )

  return (
    <section className="space-y-14">
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: seo.title,
            description: seo.description,
            url: "/home",
          }),
          breadcrumbJsonLd([{ name: "Home", path: "/home" }]),
        ]}
      />
      <section className="space-y-5">
        <SectionHeading
          badge="Wellcome"
          title="Let's find out"
          description="Track resources, collections, and the content your audience engages with the most."
        />
        <SeoHero
          badge={seo.badge}
          title={seo.title}
          description={seo.description}
          primaryCta="Start learning"
          secondaryCta="View profile"
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
        <SectionHeading
          badge="Start Here"
          title="Create your first learning item"
          description="Follow these steps when you are not sure where to begin."
        />
        <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-4">
          <FeatureCard
            chip="1"
            title="Upload a resource"
            description="Add a PDF, document, or slide deck that learners can preview."
            href="/home/resources/create"
          />
          <FeatureCard
            chip="2"
            title="Group related content"
            description="Create a collection so learners can follow a clear path."
            href="/home/collections/create"
          />
          <FeatureCard
            chip="3"
            title="Check the preview"
            description="Open the resource page and make sure the preview is useful."
            href="/content"
          />
          <FeatureCard
            chip="4"
            title="Follow the result"
            description="Use Content to see whether your upload is ready for learners."
            href="/content"
          />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
        <SectionHeading
          badge="Quick Picks"
          title="Today's Highlights"
          description="Jump into learning items people are opening most today."
        />
        <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-3">
          <FeatureCard
            chip="Resource"
            title="Featured resources"
            description="A roundup of the most viewed materials in the last 24 hours."
            href="/explore/resources"
          />
          <FeatureCard
            chip="Tutorial"
            title="Trending videos"
            description="Top tutorial videos to improve practical skills and study outcomes."
            href="/explore/tutorials"
          />
          <FeatureCard
            chip="Collection"
            title="Collections"
            description="Curated collections tailored by subject area and learning goals."
            href="/explore/resources/collections"
          />
        </div>
      </section>

      <TrendingSection limit={3} />

      <HomeModeSwitcher
        resourceCollections={resourceCollections}
        tutorialCollections={tutorialCollections}
        resources={resources}
        tutorials={tutorials}
      />
    </section>
  )
}
