"use client"

import { Flame } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ForumTopic } from "@/features/forum/types"

export function ForumTrendingTopic({
  topics,
  onTopicSelect,
}: {
  topics: ForumTopic[]
  onTopicSelect: (topicId: string) => void
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Trending</h2>
          <p className="text-sm text-muted-foreground">
            Most active right now.
          </p>
        </div>
        <Flame className="size-5 text-primary" />
      </div>
      <div className="space-y-3">
        {topics.map((topic, index) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onTopicSelect(topic.id)}
            className="w-full rounded-xl border border-border/70 bg-background/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-secondary/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">#{index + 1}</Badge>
              <span className="text-xs text-muted-foreground">
                {topic.replies} replies
              </span>
            </div>
            <p className="text-sm leading-5 font-medium">{topic.title}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
