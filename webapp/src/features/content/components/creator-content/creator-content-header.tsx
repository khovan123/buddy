import Link from "next/link"

import { Button } from "@/components/ui/button"

interface CreatorContentHeaderProps {
  title: React.ReactNode
  description: string
  actionLabel: string
  actionHref: string
  actionIcon: React.ElementType
}

export function CreatorContentHeader({
  title,
  description,
  actionLabel,
  actionHref,
  actionIcon: ActionIcon,
}: CreatorContentHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" className="gap-1.5" asChild>
        <Link href={actionHref}>
          <ActionIcon className="size-4" />
          {actionLabel}
        </Link>
      </Button>
    </div>
  )
}
