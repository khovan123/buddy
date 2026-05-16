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
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <MetaChip>{chip}</MetaChip>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-card-foreground">
        {title}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
        <Link href={href}>Discovery now</Link>
      </Button>
    </article>
  )
}
