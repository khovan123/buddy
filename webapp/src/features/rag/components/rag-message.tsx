"use client"

import { Sparkles } from "lucide-react"

import { UserAvatar } from "@/components/atoms/user-avatar"
import type { UserProfile } from "@/features/user/services/user-api"

import type { RAGMessage } from "../types"

import { RAGSourceCard } from "./rag-source-card"

interface RAGMessageProps {
  message: RAGMessage
  user?: UserProfile
}

export function RAGMessageBlock({ message, user }: RAGMessageProps) {
  const isUser = message.role === "user"

  if (isUser) {
    return (
      <div className="flex w-full items-start gap-6 px-2 py-4">
        <UserAvatar
          name={user?.nickname || "User"}
          src={user?.profile?.avatarUrl}
          className="mt-0.5 size-9 shrink-0 ring-1 ring-border/20"
        />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {user?.nickname || "You"}
          </p>
          <div className="text-base leading-relaxed text-foreground/90">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  // Assistant Message
  return (
    <div className="flex w-full items-start gap-6 rounded-2xl bg-secondary/20 px-6 py-8 ring-1 ring-border/30">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
        <Sparkles className="size-4" />
      </div>
      <div className="flex-1 space-y-6">
        {/* Message text */}
        <div className="space-y-4 text-body leading-relaxed tracking-normal text-foreground/90">
          {message.content.split("\n").map((paragraph, i) => {
            const key = `${message.id}-p-${i}`
            return paragraph.trim() ? (
              <p key={key}>{paragraph}</p>
            ) : (
              <br key={key} />
            )
          })}
        </div>

        {/* Source citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-8 border-t border-border/40 pt-6">
            <p className="mb-4 text-2xs font-bold tracking-extra-wide text-muted-foreground/80 uppercase">
              References
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {message.sources.map((source) => (
                <RAGSourceCard key={source.slug} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Timing metadata */}
        {/* {message.retrievalTimeMs !== undefined && (
          <div className="flex gap-4 text-[10px] font-medium tracking-wider text-muted-foreground/50 uppercase">
            <span>Retrieval: {message.retrievalTimeMs.toFixed(0)}ms</span>
            <span>Generation: {message.generationTimeMs?.toFixed(0)}ms</span>
          </div>
        )} */}
      </div>
    </div>
  )
}
