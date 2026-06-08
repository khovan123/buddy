"use client"

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"

import {
  Flame,
  Hash,
  MessageCircle,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react"

import { ForumMetric } from "@/components/atoms/forum-metric"
import { ForumMentionTextarea } from "@/components/molecules/forum-mention-textarea"
import { ForumMessageItem } from "@/components/molecules/forum-message-item"
import { ForumTopicCard } from "@/components/molecules/forum-topic-card"
import { ForumTopicDetail } from "@/components/organisms/forum-topic-detail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useGetContentMetaQuery } from "@/features/content/services/content-api"
import { MajorStatus } from "@/features/content/types"
import { forumSocket } from "@/features/forum/services/forum-socket"
import type {
  ForumBootstrap,
  ForumMention,
  ForumMessage,
  ForumTopic,
  ForumTopicReaction,
} from "@/features/forum/types"
import {
  addMessage,
  applyViewerReaction,
  getTopicScore,
  upsertTopic,
} from "@/features/forum/utils/forum-utils"

export function ForumPage() {
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [topicMessages, setTopicMessages] = useState<
    Record<string, ForumMessage[]>
  >({})
  const [topicTitle, setTopicTitle] = useState("")
  const [topicBody, setTopicBody] = useState("")
  const [topicMajorId, setTopicMajorId] = useState("")
  const [chatInput, setChatInput] = useState("")
  const [chatMentions, setChatMentions] = useState<ForumMention[]>([])
  const [replyInput, setReplyInput] = useState("")
  const [replyMentions, setReplyMentions] = useState<ForumMention[]>([])
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const highlightedCommentRef = useRef<string | null>(null)
  const viewedTopicIdsRef = useRef<Set<string>>(new Set())
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null)
  const { data: metaResponse } = useGetContentMetaQuery()

  const majors = useMemo(
    () =>
      (metaResponse?.data?.majors ?? []).filter(
        (major) => major.status === MajorStatus.ACTIVE
      ),
    [metaResponse]
  )
  const selectedMajor = majors.find((major) => major.id === topicMajorId)
  const filteredTopics = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return topics
    }

    return topics.filter((topic) =>
      [topic.title, topic.excerpt, topic.author, topic.tag]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [searchTerm, topics])
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId)
  const selectedTopicMessages = useMemo(
    () => (selectedTopicId ? (topicMessages[selectedTopicId] ?? []) : []),
    [selectedTopicId, topicMessages]
  )
  const trendingTopics = useMemo(
    () =>
      [...topics]
        .sort((a, b) => getTopicScore(b) - getTopicScore(a))
        .slice(0, 3),
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
        const data = (await forumSocket.bootstrap()) as ForumBootstrap

        if (isMounted) {
          setTopics(data.topics)
          setMessages(data.messages)
          setTopicMessages(data.topicMessages ?? {})

          const params = new URLSearchParams(globalThis.location.search)
          const topicId = params.get("topic")
          highlightedCommentRef.current = params.get("comment")
          if (topicId) {
            setSelectedTopicId(topicId)
          } else if (data.topics[0]) {
            setSelectedTopicId(data.topics[0].id)
          }
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
    return forumSocket.subscribe((event) => {
      if (event.type === "forum.topic") {
        setTopics((currentTopics) => upsertTopic(currentTopics, event.data))
      }

      if (event.type === "forum.message") {
        const message = event.data
        if (message.topicId) {
          setTopicMessages((currentMessages) => ({
            ...currentMessages,
            [message.topicId!]: addMessage(
              currentMessages[message.topicId!] ?? [],
              message
            ),
          }))
          return
        }

        setMessages((currentMessages) => addMessage(currentMessages, message))
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedTopicId || viewedTopicIdsRef.current.has(selectedTopicId)) {
      return
    }

    viewedTopicIdsRef.current.add(selectedTopicId)

    forumSocket
      .viewTopic(selectedTopicId)
      .then((topic) => {
        setTopics((currentTopics) => upsertTopic(currentTopics, topic))
      })
      .catch(() => undefined)
  }, [selectedTopicId])

  useEffect(() => {
    const commentId = highlightedCommentRef.current
    if (!commentId || selectedTopicMessages.length === 0) {
      return
    }

    const timer = globalThis.setTimeout(() => {
      document.getElementById(`forum-comment-${commentId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      highlightedCommentRef.current = null
    }, 120)

    return () => globalThis.clearTimeout(timer)
  }, [messages, selectedTopicMessages])

  async function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = topicTitle.trim()
    const body = topicBody.trim()

    if (!title || !body || !selectedMajor) {
      return
    }

    const topic = await forumSocket.createTopic({
      title,
      excerpt: body,
      majorId: selectedMajor.id,
      tag: selectedMajor.name,
    })

    if (topic) {
      setTopics((currentTopics) => upsertTopic(currentTopics, topic))
      setSelectedTopicId(topic.id)
    }

    setTopicTitle("")
    setTopicBody("")
    setTopicMajorId("")
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = chatInput.trim()

    if (!message) {
      return
    }

    const nextMessage = await forumSocket.createMessage({
      message,
      mentions: chatMentions,
    })

    if (nextMessage) {
      setMessages((currentMessages) => addMessage(currentMessages, nextMessage))
    }

    setChatInput("")
    setChatMentions([])
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = replyInput.trim()

    if (!message || !selectedTopicId) {
      return
    }

    const reply = await forumSocket.createReply({
      topicId: selectedTopicId,
      message,
      mentions: replyMentions,
    })

    if (reply) {
      setTopicMessages((currentMessages) => ({
        ...currentMessages,
        [selectedTopicId]: addMessage(
          currentMessages[selectedTopicId] ?? [],
          reply
        ),
      }))
    }

    setReplyInput("")
    setReplyMentions([])
  }

  async function reactToTopic(reaction: ForumTopicReaction) {
    if (!selectedTopicId) {
      return
    }

    setTopics((currentTopics) =>
      currentTopics.map((topic) =>
        topic.id === selectedTopicId
          ? applyViewerReaction(topic, reaction)
          : topic
      )
    )

    try {
      const topic = await forumSocket.reactToTopic(selectedTopicId, reaction)
      if (topic) {
        setTopics((currentTopics) => upsertTopic(currentTopics, topic))
      }
      return
    } catch {
      // Roll back below.
    }

    setTopics((currentTopics) =>
      currentTopics.map((topic) =>
        topic.id === selectedTopicId
          ? applyViewerReaction(topic, reaction)
          : topic
      )
    )
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                    Follow new topics, answer questions, react to discussions,
                    and mention people when their context matters.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-background/70 p-2 text-center">
                <ForumMetric label="Topics" value={topics.length.toString()} />
                <ForumMetric label="Replies" value={totalReplies.toString()} />
                <ForumMetric label="Online" value="42" />
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
                    Pick a major tag before posting.
                  </p>
                </div>
              </div>
              <Select value={topicMajorId} onValueChange={setTopicMajorId}>
                <SelectTrigger aria-label="Topic major tag">
                  <SelectValue placeholder="Select major tag" />
                </SelectTrigger>
                <SelectContent>
                  {majors.map((major) => (
                    <SelectItem key={major.id} value={major.id}>
                      {major.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button type="submit" className="w-full" disabled={!topicMajorId}>
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
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
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
                {!isLoading && filteredTopics.length === 0 ? (
                  <div className="rounded-xl border border-border/75 bg-background/68 p-4 text-sm text-muted-foreground">
                    No topics found.
                  </div>
                ) : null}
                {filteredTopics.map((topic) => (
                  <ForumTopicCard
                    key={topic.id}
                    topic={topic}
                    active={topic.id === selectedTopicId}
                    onSelect={() => setSelectedTopicId(topic.id)}
                  />
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
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
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

          <ForumTopicDetail
            topic={selectedTopic}
            messages={selectedTopicMessages}
            replyInput={replyInput}
            replyMentions={replyMentions}
            onReplyInputChange={setReplyInput}
            onReplyMentionsChange={setReplyMentions}
            onReplySubmit={sendReply}
            onReact={reactToTopic}
            replyInputRef={replyInputRef}
          />

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
            <div className="max-h-90 space-y-3 overflow-y-auto p-4">
              {!isLoading && messages.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                  No messages yet.
                </div>
              ) : null}
              {messages.map((message) => (
                <ForumMessageItem key={message.id} message={message} />
              ))}
            </div>
            <form
              onSubmit={sendMessage}
              className="space-y-2 border-t border-border/70 p-3"
            >
              <ForumMentionTextarea
                value={chatInput}
                mentions={chatMentions}
                onValueChange={setChatInput}
                onMentionsChange={setChatMentions}
                placeholder="Message everyone"
                minHeightClassName="min-h-10"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  <Send className="size-4" />
                  Send
                </Button>
              </div>
            </form>
          </section>
        </aside>
      </div>
    </section>
  )
}
