import type { ReactNode } from "react"

type MetaChipProps = {
  children: ReactNode
}

export function MetaChip({ children }: MetaChipProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}
