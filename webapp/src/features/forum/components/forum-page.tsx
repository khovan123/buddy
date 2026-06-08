"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

import {
  Flame,
  Hash,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type {
  ForumBootstrap,
  ForumMessage,
  ForumTopic,
} from "@/features/forum/types"
import { cn } from "@/lib/utils"

const TRENDING_TAGS = [
  { label: "Interview prep", count: 128 },
  { label: "AI tools", count: 94 },
  { label: "Scholarships", count: 73 },
  { label: "Next.js", count: 61 },
]

export function ForumPage() {
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [topicTitle, setTopicTitle] = useState("")
  const [topicBody, setTopicBody] = useState("")
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const trendingTopics = useMemo(
    () => topics.filter((topic) => topic.trending).slice(0, 3),
    [topics]
  )
  const totalReplies = useMemo(
    () => topics.reduce((sum, topic) => sum + topic.replies, 0),
    [topics]
  )

  useEffect(() => {
    let isMounted = true

    async function loadForum() {
      try {
        const response = await fetch("/api/forum", { cache: "no-store" })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as {
          data?: ForumBootstrap
        }

        if (isMounted && payload.data) {
          setTopics(payload.data.topics)
          setMessages(payload.data.messages)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadForum()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const events = new EventSource("/api/forum/events")

    events.addEventListener("forum.topic", (event) => {
      const topic = JSON.parse((event as MessageEvent).data) as ForumTopic
      setTopics((currentTopics) => addTopic(currentTopics, topic))
    })

    events.addEventListener("forum.message", (event) => {
      const message = JSON.parse((event as MessageEvent).data) as ForumMessage
      setMessages((currentMessages) => addMessage(currentMessages, message))
    })

    return () => {
      events.close()
    }
  }, [])

  async function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = topicTitle.trim()
    const body = topicBody.trim()

    if (!title || !body) {
      return
    }

    const response = await fetch("/api/forum/topics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, excerpt: body }),
    })

    if (response.ok) {
      const payload = (await response.json()) as { data?: ForumTopic }
      const topic = payload.data

      if (topic) {
        setTopics((currentTopics) => addTopic(currentTopics, topic))
      }

      setTopicTitle("")
      setTopicBody("")
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = chatInput.trim()

    if (!message) {
      return
    }

    const response = await fetch("/api/forum/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    })

    if (response.ok) {
      const payload = (await response.json()) as { data?: ForumMessage }
      const nextMessage = payload.data

      if (nextMessage) {
        setMessages((currentMessages) =>
          addMessage(currentMessages, nextMessage)
        )
      }

      setChatInput("")
    }
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-[0_24px_60px_-42px_color-mix(in_oklch,var(--education-sage)_80%,transparent)]">
          <div className="border-b border-border/70 bg-secondary/35 p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Badge variant="outline" className="gap-1.5">
                  <Users className="size-3.5" />
                  Forum
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Discuss, ask, and learn together
                  </h1>
                  <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                    Follow new topics, compare trending discussions, and keep a
                    live study room open with everyone.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-background/70 p-2 text-center">
                <Metric label="Topics" value={topics.length.toString()} />
                <Metric label="Replies" value={totalReplies.toString()} />
                <Metric label="Online" value="42" />
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <form
              onSubmit={createTopic}
              className="space-y-4 rounded-xl border border-border/75 bg-background/68 p-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Plus className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">New topic</h2>
                  <p className="text-xs text-muted-foreground">
                    Start a question or discussion.
                  </p>
                </div>
              </div>
              <Input
                value={topicTitle}
                onChange={(event) => setTopicTitle(event.target.value)}
                placeholder="Topic title"
                aria-label="Topic title"
              />
              <Textarea
                value={topicBody}
                onChange={(event) => setTopicBody(event.target.value)}
                placeholder="What do you want to discuss?"
                aria-label="Topic body"
                className="min-h-28 rounded-xl"
              />
              <Button type="submit" className="w-full">
                <Plus className="size-4" />
                Post topic
              </Button>
            </form>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">New topics</h2>
                  <p className="text-sm text-muted-foreground">
                    Fresh discussions from the Buddy community.
                  </p>
                </div>
                <div className="relative sm:w-64">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search forum"
                    aria-label="Search forum"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                {isLoading ? (
                  <div className="rounded-xl border border-border/75 bg-background/68 p-4 text-sm text-muted-foreground">
                    Loading forum...
                  </div>
                ) : null}
                {!isLoading && topics.length === 0 ? (
                  <div className="rounded-xl border border-border/75 bg-background/68 p-4 text-sm text-muted-foreground">
                    No topics yet. Start the first discussion.
                  </div>
                ) : null}
                {topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
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
              {trendingTopics.map((topic, index) => (
                <div
                  key={topic.id}
                  className="rounded-xl border border-border/70 bg-background/60 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {topic.replies} replies
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-5">{topic.title}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Hot tags</h2>
                <p className="text-sm text-muted-foreground">
                  Channels gaining traction.
                </p>
              </div>
              <Hash className="size-5 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TRENDING_TAGS.map((tag) => (
                <div
                  key={tag.label}
                  className="rounded-xl border border-border/70 bg-background/60 p-3"
                >
                  <p className="text-sm font-medium">{tag.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tag.count} posts
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/70">
            <div className="border-b border-border/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Chat everyone</h2>
                  <p className="text-sm text-muted-foreground">
                    Open study room.
                  </p>
                </div>
                <MessageCircle className="size-5 text-primary" />
              </div>
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
              {!isLoading && messages.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                  No messages yet.
                </div>
              ) : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-xl border p-3",
                    message.tone === "primary"
                      ? "border-primary/25 bg-primary/10"
                      : "border-border/70 bg-background/60"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {message.author}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.time}
                    </span>
                  </div>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {message.message}
                  </p>
                </div>
              ))}
            </div>
            <form
              onSubmit={sendMessage}
              className="flex gap-2 border-t border-border/70 p-3"
            >
              <Input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Message everyone"
                aria-label="Message everyone"
              />
              <Button type="submit" size="icon" aria-label="Send message">
                <Send className="size-4" />
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-16 rounded-lg px-2 py-2">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function TopicCard({ topic }: { topic: ForumTopic }) {
  return (
    <article className="rounded-xl border border-border/75 bg-background/68 p-4 transition-colors hover:border-primary/30 hover:bg-secondary/30">
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
              by {topic.author}
            </span>
          </div>
          <h3 className="text-base font-semibold leading-6 text-foreground">
            {topic.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {topic.excerpt}
          </p>
        </div>
        <div className="grid min-w-36 grid-cols-3 gap-2 text-center sm:grid-cols-1">
          <TopicStat label="Replies" value={topic.replies.toString()} />
          <TopicStat label="Views" value={topic.views} />
          <TopicStat label="Active" value={topic.activity} />
        </div>
      </div>
    </article>
  )
}

function TopicStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/45 px-2 py-1.5">
      <p className="text-xs font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function addTopic(topics: ForumTopic[], topic: ForumTopic) {
  if (topics.some((currentTopic) => currentTopic.id === topic.id)) {
    return topics
  }

  return [topic, ...topics]
}

function addMessage(messages: ForumMessage[], message: ForumMessage) {
  if (messages.some((currentMessage) => currentMessage.id === message.id)) {
    return messages
  }

  return [...messages, message]
}
