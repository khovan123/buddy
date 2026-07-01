"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { TranslationKey } from "@/i18n/dictionary"
import { useI18n } from "@/i18n/language-provider"

import { Card, CardContent } from "../ui/card"

type SeoHeroProps = {
  badge?: string
  title?: string
  description?: string
  primaryCta?: string
  secondaryCta?: string
  translationKeys?: {
    badge: TranslationKey
    title: TranslationKey
    description: TranslationKey
  }
}

export function SeoHero({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  translationKeys,
}: SeoHeroProps) {
  const { t } = useI18n()
  const resolvedBadge = translationKeys ? t(translationKeys.badge) : badge
  const resolvedTitle = translationKeys ? t(translationKeys.title) : title
  const resolvedDescription = translationKeys
    ? t(translationKeys.description)
    : description

  return (
    <Card className="relative isolate overflow-hidden border-border/70 bg-card/80 shadow-[0_28px_70px_-50px_color-mix(in_oklch,var(--education-ink)_45%,transparent)]">
      <div className="pointer-events-none absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-16 -z-10 size-64 rounded-full bg-accent/15 blur-3xl" />
      <CardContent className="grid gap-8 p-7 md:grid-cols-[1.2fr_0.8fr] md:p-10">
        <div className="space-y-5">
          <p className="text-2xs font-bold tracking-[0.22em] text-primary uppercase">
            {resolvedBadge}
          </p>
          <h1 className="max-w-4xl text-4xl leading-none font-semibold tracking-tighter text-card-foreground md:text-6xl">
            {resolvedTitle}
          </h1>
          <p className="max-w-[65ch] text-base leading-7 text-muted-foreground md:text-lg">
            {resolvedDescription}
          </p>
        </div>
        <div className="flex flex-col justify-end gap-3 md:items-end">
          <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-background/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {t("home.seoHero.learningLoop")}
            </p>
            <div className="mt-4 grid gap-2 text-sm text-foreground">
              <span className="rounded-2xl bg-secondary/55 px-3 py-2">
                {t("home.seoHero.discover")}
              </span>
              <span className="rounded-2xl bg-secondary/55 px-3 py-2">
                {t("home.seoHero.study")}
              </span>
              <span className="rounded-2xl bg-secondary/55 px-3 py-2">
                {t("home.seoHero.nextStep")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {primaryCta && (
              <Button asChild>
                <Link href={"/explore"}>{primaryCta}</Link>
              </Button>
            )}
            {secondaryCta && (
              <Button variant="outline" asChild>
                <Link href={"/profile"}>{secondaryCta}</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
