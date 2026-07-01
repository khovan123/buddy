"use client"

import { Hash, Heart, Laugh, Sparkles, ThumbsUp } from "lucide-react"

import { ForumTopicStat } from "@/components/atoms/forum-topic-stat"
import { Badge } from "@/components/ui/badge"
import type { ForumTopic } from "@/features/forum/types"
import { getTopicReactions } from "@/features/forum/utils/forum-utils"
import { useI18n } from "@/i18n/language-provider"
import { cn } from "@/lib/utils"


export function ForumTopicCard({
  topic,
  active,
  onSelect,
}: {
  topic: ForumTopic
  active: boolean
  onSelect: () => void
}) {
  const { t } = useI18n()
  const reactions = getTopicReactions(topic)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-xl border border-border/75 bg-background/68 p-4 text-left transition-colors hover:border-primary/30 hover:bg-secondary/30",
        active && "border-primary/40 bg-primary/10"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={topic.trending ? "default" : "outline"}>
              {topic.trending ? (
                <Sparkles className="size-3" />
              ) : (
                <Hash className="size-3" />
              )}
              {topic.tag}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t("forum.common.by")} {topic.author}
            </span>
          </div>
          <h3 className="text-base leading-6 font-semibold text-foreground">
            {topic.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {topic.excerpt}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3" />
              {reactions.like}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" />
              {reactions.tym}
            </span>
            <span className="inline-flex items-center gap-1">
              <Laugh className="size-3" />
              {reactions.haha}
            </span>
          </div>
        </div>
        <div className="grid min-w-36 grid-cols-3 gap-2 text-center sm:grid-cols-1">
          <ForumTopicStat
            label={t("forum.metrics.replies")}
            value={topic.replies.toString()}
          />
          <ForumTopicStat
            label={t("forum.topicCard.views")}
            value={topic.views ?? topic.viewCount.toString()}
          />
          <ForumTopicStat label={t("forum.topicCard.active")} value={topic.activity} />
        </div>
      </div>
    </button>
  )
}
