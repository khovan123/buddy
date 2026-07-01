"use client"

import { SectionHeading } from "@/components/atoms/section-heading"
import { FeatureCard } from "@/components/molecules/feature-card"
import { SeoHero } from "@/components/molecules/seo-hero"
import { useI18n } from "@/i18n/language-provider"

export function HomeOverviewSections() {
  const { t } = useI18n()

  return (
    <>
      <section className="space-y-5">
        <SectionHeading
          badge={t("home.hero.badge")}
          title={t("home.hero.title")}
          description={t("home.hero.description")}
        />
        <SeoHero
          translationKeys={{
            badge: "page.home.badge",
            title: "page.home.title",
            description: "page.home.description",
          }}
          primaryCta={t("home.hero.primaryCta")}
          secondaryCta={t("home.hero.secondaryCta")}
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
        <SectionHeading
          badge={t("home.startHere.badge")}
          title={t("home.startHere.title")}
          description={t("home.startHere.description")}
        />
        <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-4">
          <FeatureCard
            chip="1"
            title={t("home.startHere.step1Title")}
            description={t("home.startHere.step1Description")}
            href="/home/resources/create"
          />
          <FeatureCard
            chip="2"
            title={t("home.startHere.step2Title")}
            description={t("home.startHere.step2Description")}
            href="/home/collections/create"
          />
          <FeatureCard
            chip="3"
            title={t("home.startHere.step3Title")}
            description={t("home.startHere.step3Description")}
            href="/content"
          />
          <FeatureCard
            chip="4"
            title={t("home.startHere.step4Title")}
            description={t("home.startHere.step4Description")}
            href="/content"
          />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
        <SectionHeading
          badge={t("home.quickPicks.badge")}
          title={t("home.quickPicks.title")}
          description={t("home.quickPicks.description")}
        />
        <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-3">
          <FeatureCard
            chip={t("nav.resource")}
            title={t("home.quickPicks.resourceTitle")}
            description={t("home.quickPicks.resourceDescription")}
            href="/explore/resources"
          />
          <FeatureCard
            chip={t("nav.tutorial")}
            title={t("home.quickPicks.tutorialTitle")}
            description={t("home.quickPicks.tutorialDescription")}
            href="/explore/tutorials"
          />
          <FeatureCard
            chip={t("content.collections")}
            title={t("home.quickPicks.collectionTitle")}
            description={t("home.quickPicks.collectionDescription")}
            href="/explore/resources/collections"
          />
        </div>
      </section>
    </>
  )
}
