import Link from "next/link"

import { MetaChip } from "@/components/atoms/meta-chip"
import { Button } from "@/components/ui/button"

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
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border/70 bg-card/80 p-5 shadow-[0_18px_38px_-32px_color-mix(in_oklch,var(--education-ink)_45%,transparent)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-card">
      <div className="mb-4">
        <MetaChip>{chip}</MetaChip>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-card-foreground">
        {title}
      </h3>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
        <Link href={href}>Discovery now</Link>
      </Button>
    </article>
  )
}
