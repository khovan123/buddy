"use client"

import { useRef, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Hash, MessageCircle, Reply, Sparkles } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { ForumMentionTextarea } from "@/components/molecules/forum-mention-textarea"
import { ForumMessageItem } from "@/components/molecules/forum-message-item"
import { ForumReactionControl } from "@/components/molecules/forum-reaction-control"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  forumMessageSchema,
  type ForumMessageFormValues,
} from "@/features/forum/schema"
import type {
  ForumMention,
  ForumMessage,
  ForumTopic,
  ForumTopicReaction,
} from "@/features/forum/types"

export function ForumTopicDetail({
  topic,
  messages,
  onReplySubmit,
  onReact,
}: {
  topic?: ForumTopic
  messages: ForumMessage[]
  onReplySubmit: (
    values: ForumMessageFormValues & { mentions: ForumMention[] }
  ) => Promise<boolean | void>
  onReact: (reaction: ForumTopicReaction) => void
}) {
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null)
  const [mentions, setMentions] = useState<ForumMention[]>([])
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForumMessageFormValues>({
    resolver: zodResolver(forumMessageSchema),
    defaultValues: { message: "" },
  })
  const message = useWatch({ control, name: "message" }) ?? ""

  async function submit(values: ForumMessageFormValues) {
    if (!topic) {
      return false
    }

    const didSubmit = await onReplySubmit({ ...values, mentions })

    if (didSubmit !== false) {
      reset()
      setMentions([])
    }
  }

  if (!topic) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card/70 p-4 text-sm text-muted-foreground">
        Select a topic to answer and react.
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-card/70">
      <div className="space-y-3 border-b border-border/70 p-4">
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
        <h2 className="text-base leading-6 font-semibold">{topic.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {topic.excerpt}
        </p>
        <div className="flex flex-wrap gap-2">
          <ForumReactionControl topic={topic} onReact={onReact} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              replyInputRef.current?.focus()
              replyInputRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }}
            className="h-8 gap-1.5"
          >
            <MessageCircle className="size-3.5" />
            Answer
          </Button>
        </div>
      </div>
      {messages.length > 0 ? (
        <div className="max-h-112 space-y-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <ForumMessageItem key={message.id} message={message} isReply />
          ))}
        </div>
      ) : null}
      <form onSubmit={handleSubmit(submit)} className="space-y-2 border-t p-3">
        <ForumMentionTextarea
          textareaRef={replyInputRef}
          value={message}
          mentions={mentions}
          onValueChange={(value) =>
            setValue("message", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onMentionsChange={setMentions}
          placeholder="Answer this topic. Type @ to mention someone."
        />
        {errors.message ? (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            <Reply className="size-4" />
            Answer
          </Button>
        </div>
      </form>
    </section>
  )
}
