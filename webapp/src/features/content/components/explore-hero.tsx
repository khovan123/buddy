"use client"

import { MotionHero } from "@/components/atoms/motion-primitives"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n/language-provider"

export function ExploreHero() {
  const { t } = useI18n()

  return (
    <header className="relative space-y-3 overflow-hidden rounded-2xl border border-white/5 bg-card/30 px-6 py-8 shadow-lg backdrop-blur-xl md:px-8 md:py-10">
      {/* Decorative Orbs - smaller and subtler */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-primary/20 blur-20" />
      <div className="pointer-events-none absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-accent/15 blur-20" />

      <div className="relative z-10 flex flex-col items-start space-y-2.5">
        <MotionHero delay={0}>
          <Badge
            variant="outline"
            className="h-auto rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-2xs font-semibold tracking-widest text-primary uppercase backdrop-blur-md"
          >
            {t("page.explore.badge")}
          </Badge>
        </MotionHero>

        <MotionHero delay={0.1}>
          <h1 className="text-2xl font-extrabold tracking-tighter text-foreground md:text-3xl lg:text-4xl">
            <span className="bg-linear-to-br from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-sm">
              {t("page.explore.title")}
            </span>
          </h1>
        </MotionHero>

        <MotionHero delay={0.2}>
          <p className="max-w-xl text-sm font-medium text-muted-foreground/90 md:text-base">
            {t("page.explore.description")}
          </p>
        </MotionHero>
      </div>
    </header>
  )
}
