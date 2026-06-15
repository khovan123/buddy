"use client"

import { type KeyboardEvent, type RefObject, useEffect, useState } from "react"

import { AtSign, Loader2, SearchX, WifiOff, X } from "lucide-react"

import { UserAvatar } from "@/components/atoms/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type {
  ForumMention,
  ForumMentionCandidate,
} from "@/features/forum/types"
import { addMention, getMentionQuery } from "@/features/forum/utils/forum-utils"
import { cn } from "@/lib/utils"

export function ForumMentionTextarea({
  textareaRef,
  value,
  mentions,
  onValueChange,
  onMentionsChange,
  placeholder,
  minHeightClassName = "min-h-24",
}: {
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  value: string
  mentions: ForumMention[]
  onValueChange: (value: string) => void
  onMentionsChange: (mentions: ForumMention[]) => void
  placeholder: string
  minHeightClassName?: string
}) {
  const [candidates, setCandidates] = useState<ForumMentionCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const mentionQuery = getMentionQuery(value)
  const visibleCandidates = mentionQuery === null ? [] : candidates

  useEffect(() => {
    if (mentionQuery === null) {
      return
    }

    const controller = new AbortController()
    const timer = globalThis.setTimeout(() => {
      setIsSearching(true)
      setSearchFailed(false)
      fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            setSearchFailed(true)
            return { data: [] }
          }
          return (await response.json()) as { data?: ForumMentionCandidate[] }
        })
        .then((payload) => setCandidates(payload.data ?? []))
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchFailed(true)
          }
        })
        .finally(() => setIsSearching(false))
    }, 180)

    return () => {
      controller.abort()
      globalThis.clearTimeout(timer)
    }
  }, [mentionQuery])

  function selectMention(candidate: ForumMentionCandidate) {
    const query = getMentionQuery(value)
    const marker = query === null ? "@" : `@${query}`
    const markerIndex = value.lastIndexOf(marker)
    const username = candidate.username ?? candidate.name
    const nextValue =
      markerIndex >= 0
        ? `${value.slice(0, markerIndex)}@${username} ${value.slice(markerIndex + marker.length)}`
        : `${value} @${username} `

    onValueChange(nextValue)
    onMentionsChange(addMention(mentions, candidate))
    setCandidates([])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      setCandidates([])
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn("rounded-xl pr-10", minHeightClassName)}
        />
        <AtSign className="pointer-events-none absolute top-3 right-3 size-4 text-muted-foreground" />
        {mentionQuery !== null ? (
          <div className="absolute right-0 bottom-full z-20 mb-2 w-full rounded-xl border border-border bg-popover p-2 shadow-lg">
            <div className="mb-2 flex items-center gap-2 px-2 text-xs text-muted-foreground">
              {isSearching ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <AtSign className="size-3" />
              )}
              {isSearching
                ? "Looking for people..."
                : mentionQuery
                  ? "People you can mention"
                  : "Type a name to mention someone"}
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {searchFailed && !isSearching ? (
                <div className="flex items-start gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground">
                  <WifiOff className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    We could not search people right now. Please try again.
                  </span>
                </div>
              ) : null}
              {visibleCandidates.length === 0 &&
              !isSearching &&
              !searchFailed &&
              mentionQuery ? (
                <div className="flex items-start gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground">
                  <SearchX className="mt-0.5 size-3.5 shrink-0" />
                  <span>No matching people found.</span>
                </div>
              ) : null}
              {visibleCandidates.map((candidate) => (
                <button
                  key={candidate.userId}
                  type="button"
                  onClick={() => selectMention(candidate)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-secondary"
                >
                  <UserAvatar
                    src={candidate.avatarUrl}
                    name={candidate.name}
                    className="size-7"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {candidate.name}
                      {candidate.username &&
                      candidate.username !== candidate.name ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          @{candidate.username}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {mentions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {mentions.map((mention) => (
            <Badge key={mention.userId} variant="secondary" className="gap-1">
              <AtSign className="size-3" />
              {mention.name}
              <button
                type="button"
                aria-label={`Remove ${mention.name}`}
                onClick={() =>
                  onMentionsChange(
                    mentions.filter((item) => item.userId !== mention.userId)
                  )
                }
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
