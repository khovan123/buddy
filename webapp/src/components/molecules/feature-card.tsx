"use client"

import Link from "next/link"

import { ArrowUpRight, BookOpenCheck, Sparkles } from "lucide-react"

import { MetaChip } from "@/components/atoms/meta-chip"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/language-provider"

import { LearningCardShell, LearningOrbit } from "./learning-card-shell"

type FeatureCardProps = {
  title: string
  description: string
  href: string
  chip: string
}

export function FeatureCard({
  title,
  description,
  href,
  chip,
}: FeatureCardProps) {
  const { t } = useI18n()

  return (
    <LearningCardShell className="group/feature min-h-[17rem] p-5">
      <div className="relative z-10 mb-6 flex items-start justify-between gap-4">
        <MetaChip>{chip}</MetaChip>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/56 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition duration-300 group-hover/feature:-translate-y-0.5 group-hover/feature:rotate-6">
          <BookOpenCheck className="size-5" />
        </span>
      </div>

      <div className="relative z-10 mb-6 h-16 overflow-hidden rounded-2xl border border-border/55 bg-background/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="absolute top-1/2 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-card text-primary shadow-[0_10px_22px_-18px_color-mix(in_oklch,var(--education-sage)_70%,transparent)]"
            style={{
              left: `${16 + index * 34}%`,
              animation: `pulse ${2.4 + index * 0.35}s ease-in-out infinite`,
            }}
          >
            <Sparkles className="size-3" />
          </span>
        ))}
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <h3 className="mb-2 text-lg leading-tight font-semibold tracking-tight text-card-foreground transition-colors group-hover/feature:text-primary">
          {title}
        </h3>
        <p className="mb-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <Button
        asChild
        size="sm"
        variant="outline"
        className="relative z-10 mt-auto w-fit rounded-full pr-2 transition group-hover/feature:border-primary/30 group-hover/feature:bg-primary/8"
      >
        <Link href={href}>
          {t("common.discoverNow")}
          <ArrowUpRight className="size-4 transition group-hover/feature:translate-x-0.5 group-hover/feature:-translate-y-0.5" />
        </Link>
      </Button>
      <LearningOrbit active className="opacity-45" />
    </LearningCardShell>
  )
}
