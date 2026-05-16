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
    <header className="space-y-2">
      {badge ? (
        <Badge
          variant="outline"
          className="h-auto rounded-none px-0 text-xs font-semibold tracking-[0.16em] uppercase"
        >
          {badge}
        </Badge>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  )
}
