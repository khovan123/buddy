"use client"

import { AtSign } from "lucide-react"

import { UserAvatar } from "@/components/atoms/user-avatar"
import { Badge } from "@/components/ui/badge"
import type { ForumMessage } from "@/features/forum/types"
import { getMessageMentions } from "@/features/forum/utils/forum-utils"
import { cn } from "@/lib/utils"

export function ForumMessageItem({
  message,
  isReply = false,
}: {
  message: ForumMessage
  isReply?: boolean
}) {
  const mentions = getMessageMentions(message)

  return (
    <div
      id={`forum-comment-${message.id}`}
      className={cn(
        "rounded-xl border p-3",
        message.tone === "primary"
          ? "border-primary/25 bg-primary/10"
          : "border-border/70 bg-background/60",
        isReply && "scroll-mt-24"
      )}
    >
      <div className="flex gap-3">
        <UserAvatar name={message.author} className="mt-0.5 size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {message.author}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {message.time}
            </span>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            {message.message}
          </p>
          {mentions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mentions.map((mention) => (
                <Badge
                  key={mention.userId}
                  variant="secondary"
                  className="gap-1"
                >
                  <AtSign className="size-3" />
                  {mention.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
