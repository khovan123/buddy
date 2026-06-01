"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Bot, SendHorizontal, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UserProfile } from "@/features/user/services/user-api"
import { cn } from "@/lib/utils"

import { RAGServiceError, askRAG, getRAGHistory } from "../services/rag.service"
import type { RAGHistoryTurn, RAGMessage } from "../types"

import { RAGMessageBlock } from "./rag-message"

const SUGGESTIONS = [
  "What resources are available for Software Engineering?",
  "How do I get started with data structures?",
  "What tutorials cover web development?",
  "Recommend study materials for my major",
]

let messageCounter = 0
function nextMessageId(prefix: string): string {
  messageCounter += 1
  return `${prefix}-${messageCounter}`
}

function historyTurnToMessages(
  turn: RAGHistoryTurn,
  index: number
): RAGMessage[] {
  const timestamp = new Date()
  return [
    {
      id: `history-${index}-user`,
      role: "user",
      content: turn.query,
      timestamp,
    },
    {
      id: `history-${index}-assistant`,
      role: "assistant",
      content: turn.answer,
      sources: turn.sources,
      retrievalTimeMs: turn.retrievalTimeMs ?? undefined,
      generationTimeMs: turn.generationTimeMs ?? undefined,
      timestamp,
    },
  ]
}

type RAGChatProps = {
  user?: UserProfile
  accessToken?: string
  className?: string
  compact?: boolean
}

export function RAGChat({
  user,
  accessToken,
  className,
  compact = false,
}: RAGChatProps) {
  const [messages, setMessages] = useState<RAGMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    getRAGHistory(accessToken)
      .then((response) => {
        if (cancelled || response.history.length === 0) {
          return
        }

        const restoredMessages = response.history.flatMap(historyTurnToMessages)
        setMessages((prev) => (prev.length > 0 ? prev : restoredMessages))
      })
      .catch((error) => {
        console.error("Failed to load RAG history:", error)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken])

  const handleSend = useCallback(
    async (query?: string) => {
      const text = (query || input).trim()
      if (!text || isLoading) {
        return
      }

      setInput("")

      const userMessage: RAGMessage = {
        id: nextMessageId("user"),
        role: "user",
        content: text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        const response = await askRAG(
          {
            query: text,
            userId: user?.userId ?? user?.id,
          },
          accessToken
        )

        const assistantMessage: RAGMessage = {
          id: nextMessageId("assistant"),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          retrievalTimeMs: response.retrievalTimeMs,
          generationTimeMs: response.generationTimeMs,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (error) {
        const content =
          error instanceof RAGServiceError && error.isUnavailable
            ? "Buddy Intelligence is warming up or temporarily unavailable. Please try again in a moment."
            : "Sorry, I encountered an error processing your question. Please try again."
        const errorMessage: RAGMessage = {
          id: nextMessageId("error"),
          role: "assistant",
          content,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
        console.error("RAG error:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, input, isLoading, user]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={cn(
        "h-chat mx-auto flex w-full max-w-4xl flex-col bg-background font-sans",
        className
      )}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col items-center justify-center border-b border-border/40",
          compact ? "px-10 pt-5 pb-4" : "pt-10 pb-6"
        )}
      >
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            compact ? "text-base" : "text-2xl"
          )}
        >
          Buddy Intelligence
        </h1>
        <p
          className={cn(
            "mt-2 text-center text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          Academic analysis and content retrieval
        </p>
      </div>

      {/* ── Messages area ────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 overflow-y-auto px-4",
          compact ? "py-5 md:px-5" : "py-8 md:px-10"
        )}
      >
        {messages.length === 0 && (
          <div
            className={cn(
              "mx-auto flex max-w-2xl animate-in flex-col items-center justify-center duration-700 fade-in",
              compact ? "mt-4" : "mt-10"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-2xl bg-secondary/30 text-primary",
                compact ? "mb-5 size-12" : "mb-8 size-16"
              )}
            >
              <Bot
                className={cn("stroke-1.5", compact ? "size-6" : "size-8")}
              />
            </div>

            <div
              className={cn(
                "grid w-full grid-cols-1 gap-3",
                !compact && "md:grid-cols-2"
              )}
            >
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-border/40 bg-card p-4 text-left transition-colors hover:bg-secondary/20"
                >
                  <span className="text-sm leading-relaxed font-medium text-foreground/90">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={cn(
            "mx-auto flex max-w-3xl flex-col",
            compact ? "gap-4" : "gap-8"
          )}
        >
          {messages.map((msg) => (
            <RAGMessageBlock key={msg.id} message={msg} user={user} />
          ))}

          {isLoading && (
            <div className="flex animate-in gap-6 duration-300 fade-in">
              <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4 animate-pulse" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex gap-1.5">
                  <span className="anim-delay-0 size-1.5 animate-pulse rounded-full bg-primary/50" />
                  <span className="anim-delay-150 size-1.5 animate-pulse rounded-full bg-primary/50" />
                  <span className="anim-delay-300 size-1.5 animate-pulse rounded-full bg-primary/50" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ── Input area ───────────────────────────────────────────── */}
      <div
        className={cn(
          "mx-auto w-full max-w-3xl px-4",
          compact ? "pb-4 md:px-4" : "pb-8 md:px-0"
        )}
      >
        <div className="relative flex w-full items-center">
          <Input
            ref={inputRef}
            placeholder="Ask about your syllabus, notes, or resources..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoComplete="off"
            className="h-14 rounded-2xl border-border/50 bg-secondary/10 pr-14 pl-6 text-base shadow-sm backdrop-blur-md transition-all focus-visible:ring-1 focus-visible:ring-primary/30"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 size-10 rounded-xl hover:bg-primary/10 hover:text-primary"
          >
            <SendHorizontal className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
