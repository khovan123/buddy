"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Search, Users } from "lucide-react"

import { ForumMetric } from "@/components/atoms/forum-metric"
import { ForumTopicCard } from "@/components/molecules/forum-topic-card"
import { ForumChatting } from "@/components/organisms/forum-chatting"
import { ForumTags } from "@/components/organisms/forum-tags"
import { ForumTopicDetail } from "@/components/organisms/forum-topic-detail"
import { ForumTopicForm } from "@/components/organisms/forum-topic-form"
import { ForumTrendingTopic } from "@/components/organisms/forum-trending-topic"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useGetContentMetaQuery } from "@/features/content/services/content-api"
import { MajorStatus } from "@/features/content/types"
import type {
  ForumMessageFormValues,
  ForumTopicFormValues,
} from "@/features/forum/schema"
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
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [onlineUsers, setOnlineUsers] = useState(0)
  const highlightedCommentRef = useRef<string | null>(null)
  const viewedTopicIdsRef = useRef<Set<string>>(new Set())
  const { data: metaResponse } = useGetContentMetaQuery()

  const majors = useMemo(
    () =>
      (metaResponse?.data?.majors ?? []).filter(
        (major) => major.status === MajorStatus.ACTIVE
      ),
    [metaResponse]
  )
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

      if (event.type === "forum.presence") {
        setOnlineUsers(event.data.onlineUsers)
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

  async function createTopic(values: ForumTopicFormValues) {
    const selectedMajor = majors.find((major) => major.id === values.majorId)

    if (!selectedMajor) {
      return false
    }

    const topic = await forumSocket.createTopic({
      title: values.title,
      excerpt: values.excerpt,
      majorId: selectedMajor.id,
      tag: selectedMajor.name,
    })

    if (topic) {
      setTopics((currentTopics) => upsertTopic(currentTopics, topic))
      setSelectedTopicId(topic.id)
    }

    return Boolean(topic)
  }

  async function sendMessage(
    values: ForumMessageFormValues & { mentions: ForumMention[] }
  ) {
    const nextMessage = await forumSocket.createMessage({
      message: values.message,
      mentions: values.mentions ?? [],
    })

    if (nextMessage) {
      setMessages((currentMessages) => addMessage(currentMessages, nextMessage))
    }

    return Boolean(nextMessage)
  }

  async function sendReply(
    values: ForumMessageFormValues & { mentions: ForumMention[] }
  ) {
    if (!selectedTopicId) {
      return false
    }

    const reply = await forumSocket.createReply({
      topicId: selectedTopicId,
      message: values.message,
      mentions: values.mentions ?? [],
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

    return Boolean(reply)
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
                <ForumMetric label="Online" value={onlineUsers.toString()} />
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <ForumTopicForm majors={majors} onSubmit={createTopic} />

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
          <ForumTrendingTopic
            topics={trendingTopics}
            onTopicSelect={setSelectedTopicId}
          />

          <ForumTags majors={majors} />

          <ForumTopicDetail
            topic={selectedTopic}
            messages={selectedTopicMessages}
            onReplySubmit={sendReply}
            onReact={reactToTopic}
          />

          <ForumChatting
            isLoading={isLoading}
            messages={messages}
            onSubmit={sendMessage}
          />
        </aside>
      </div>
    </section>
  )
}
