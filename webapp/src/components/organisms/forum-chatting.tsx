"use client"

import { useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { MessageCircle, Send } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { ForumMentionTextarea } from "@/components/molecules/forum-mention-textarea"
import { ForumMessageItem } from "@/components/molecules/forum-message-item"
import { Button } from "@/components/ui/button"
import {
  createForumMessageSchema,
  type ForumMessageFormValues,
} from "@/features/forum/schema"
import type { ForumMention, ForumMessage } from "@/features/forum/types"
import { useI18n } from "@/i18n/language-provider"

export function ForumChatting({
  isLoading,
  messages,
  onSubmit,
}: {
  isLoading: boolean
  messages: ForumMessage[]
  onSubmit: (
    values: ForumMessageFormValues & { mentions: ForumMention[] }
  ) => Promise<boolean | void>
}) {
  const { t } = useI18n()
  const [mentions, setMentions] = useState<ForumMention[]>([])
  const forumMessageSchema = useMemo(
    () => createForumMessageSchema((key) => t(key as never)),
    [t]
  )
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
    const didSubmit = await onSubmit({ ...values, mentions })

    if (didSubmit !== false) {
      reset()
      setMentions([])
    }
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-card/70">
      <div className="border-b border-border/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{t("forum.chat.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("forum.chat.description")}
            </p>
          </div>
          <MessageCircle className="size-5 text-primary" />
        </div>
      </div>
      <div className="max-h-90 space-y-3 overflow-y-auto p-4">
        {!isLoading && messages.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
            {t("forum.chat.empty")}
          </div>
        ) : null}
        {messages.map((message) => (
          <ForumMessageItem key={message.id} message={message} />
        ))}
      </div>
      <form
        onSubmit={handleSubmit(submit)}
        className="space-y-2 border-t border-border/70 p-3"
      >
        <ForumMentionTextarea
          value={message}
          mentions={mentions}
          onValueChange={(value) =>
            setValue("message", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onMentionsChange={setMentions}
          placeholder={t("forum.chat.placeholder")}
          minHeightClassName="min-h-10"
        />
        {errors.message ? (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            <Send className="size-4" />
            {t("forum.chat.send")}
          </Button>
        </div>
      </form>
    </section>
  )
}
