"use client"

import { Hash } from "lucide-react"

type ForumTag = {
  id: string
  name: string
  code: string
}

export function ForumTags({ majors }: { majors: ForumTag[] }) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Major tags</h2>
          <p className="text-sm text-muted-foreground">
            Topic channels from content majors.
          </p>
        </div>
        <Hash className="size-5 text-primary" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {majors.slice(0, 8).map((major) => (
          <div
            key={major.id}
            className="rounded-xl border border-border/70 bg-background/60 p-3"
          >
            <p className="truncate text-sm font-medium">{major.name}</p>
            <p className="text-xs text-muted-foreground">{major.code}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
