import { Badge } from "@/components/ui/badge"

type SectionHeadingProps = {
  badge?: string
  title: string
  description?: string
}

export function SectionHeading({
  badge,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <header className="space-y-3">
      {badge ? (
        <Badge
          variant="outline"
          className="text-2xs h-auto rounded-full border-primary/20 bg-secondary/45 px-3 py-1 font-bold tracking-[0.18em] text-primary uppercase"
        >
          {badge}
        </Badge>
      ) : null}
      <h2 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tighter text-foreground md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-[65ch] text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  )
}
