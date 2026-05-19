import type { ReactNode } from "react"

type MetaChipProps = {
  children: ReactNode
}

export function MetaChip({ children }: MetaChipProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-secondary/45 px-3 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  )
}
