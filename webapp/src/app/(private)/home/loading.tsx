"use client"

import { Skeleton } from "boneyard-js/react"

import { MetaChip } from "@/components/atoms/meta-chip"
import { SectionHeading } from "@/components/atoms/section-heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/i18n/language-provider"

/**
 * Home page loading — wraps mock layout in boneyard Skeleton.
 * Mirrors the real HomePage structure so boneyard captures accurate bones.
 */
export default function HomeLoading() {
  const { t } = useI18n()

  return (
    <Skeleton name="home-page" loading={true}>
      <section className="space-y-14">
        {/* ── Welcome + SeoHero ── */}
        <section className="space-y-5">
          <SectionHeading
            badge={t("home.hero.badge")}
            title={t("home.hero.title")}
            description={t("home.hero.description")}
          />
          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="space-y-5">
              <h1 className="text-3xl font-semibold tracking-tight text-card-foreground md:text-5xl">
                {t("home.loading.heroTitle")}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                {t("home.loading.heroDescription")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button>{t("home.hero.primaryCta")}</Button>
                <Button variant="outline">{t("home.hero.secondaryCta")}</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Quick Picks ── */}
        <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
          <SectionHeading
            badge={t("home.quickPicks.badge")}
            title={t("home.quickPicks.title")}
            description={t("home.quickPicks.description")}
          />
          <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <article
                key={i}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-4">
                  <MetaChip>{t("nav.resource")}</MetaChip>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                  {t("home.loading.featuredTitle")}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t("home.loading.featuredDescription")}
                </p>
                <Button size="sm" variant="outline" className="mt-auto w-fit">
                  {t("home.loading.viewDetails")}
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* ── Trending Section placeholder ── */}
        <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
          <SectionHeading
            badge={t("home.loading.trendingBadge")}
            title={t("home.loading.trendingTitle")}
            description={t("home.loading.trendingDescription")}
          />
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        </section>

        {/* ── Mode Switcher placeholder ── */}
        <div className="space-y-8">
          <section className="space-y-6 rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                  {t("home.switcher.overview")}
                </h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {t("home.switcher.overviewDescription")}
                </p>
              </div>
              <div className="flex h-10 w-56 rounded-md bg-muted" />
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("home.switcher.resourceCollectionsTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("home.switcher.resourceCollectionsDescription")}
                </p>
              </div>
            </div>
            <div className="grid items-stretch gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("home.switcher.resourceTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("home.switcher.resourceDescription")}
                </p>
              </div>
            </div>
            <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          </section>
        </div>
      </section>
    </Skeleton>
  )
}
