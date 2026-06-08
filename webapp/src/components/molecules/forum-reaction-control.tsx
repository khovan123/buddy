"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { ForumTopic, ForumTopicReaction } from "@/features/forum/types"
import {
  REACTION_META,
  getTopicReactions,
} from "@/features/forum/utils/forum-utils"
import { cn } from "@/lib/utils"


export function ForumReactionControl({
  topic,
  onReact,
}: {
  topic: ForumTopic
  onReact: (reaction: ForumTopicReaction) => void
}) {
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
  const reactions = getTopicReactions(topic)
  const activeReaction = topic.viewerReaction
  const activeReactionMeta =
    REACTION_META.find((reaction) => reaction.type === activeReaction) ??
    REACTION_META[0]
  const ActiveReactionIcon = activeReactionMeta.icon
  const totalReactions = reactions.like + reactions.tym + reactions.haha

  function handleMainReactionClick() {
    onReact(activeReaction ?? "like")
    setReactionPickerOpen(false)
  }

  function handleReactionSelect(reaction: ForumTopicReaction) {
    onReact(reaction)
    setReactionPickerOpen(false)
  }

  return (
    <div
      className="relative -mt-12 pt-12"
      onMouseEnter={() => setReactionPickerOpen(true)}
      onMouseLeave={() => setReactionPickerOpen(false)}
      onFocus={() => setReactionPickerOpen(true)}
    >
      {reactionPickerOpen ? (
        <div className="absolute top-1 left-0 z-20 flex gap-1 rounded-full border border-border bg-popover p-1 shadow-lg">
          {REACTION_META.map((reaction) => {
            const Icon = reaction.icon
            const isActive = activeReaction === reaction.type
            return (
              <button
                key={reaction.type}
                type="button"
                aria-label={reaction.label}
                aria-pressed={isActive}
                onClick={() => handleReactionSelect(reaction.type)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isActive
                    ? reaction.activeClassName
                    : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
              </button>
            )
          })}
        </div>
      ) : null}
      <Button
        type="button"
        variant={activeReaction ? "default" : "outline"}
        size="sm"
        onClick={handleMainReactionClick}
        onBlur={() => setReactionPickerOpen(false)}
        aria-pressed={Boolean(activeReaction)}
        className={cn(
          "h-8 min-w-28 gap-1.5",
          activeReaction && activeReactionMeta.activeClassName
        )}
      >
        <ActiveReactionIcon className="size-3.5" />
        {activeReaction ? activeReactionMeta.label : "Like"}
        {totalReactions > 0 ? (
          <span className="text-xs opacity-85">{totalReactions}</span>
        ) : null}
      </Button>
    </div>
  )
}
