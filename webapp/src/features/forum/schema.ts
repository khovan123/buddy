import z from "zod"

type Translate = (key: string) => string

export function createForumTopicSchema(t: Translate) {
  return z.object({
    majorId: z.string().min(1, t("forum.validation.majorRequired")),
    title: z
      .string()
      .trim()
      .min(3, t("forum.validation.topicTitleMin"))
      .max(160, t("forum.validation.topicTitleMax")),
    excerpt: z
      .string()
      .trim()
      .min(10, t("forum.validation.topicBodyMin"))
      .max(1000, t("forum.validation.topicBodyMax")),
  })
}

export const forumTopicSchema = createForumTopicSchema((key) => key)

export type ForumTopicFormValues = z.infer<typeof forumTopicSchema>

export function createForumMessageSchema(t: Translate) {
  return z.object({
    message: z
      .string()
      .trim()
      .min(1, t("forum.validation.messageRequired"))
      .max(1000, t("forum.validation.messageMax")),
  })
}

export const forumMessageSchema = createForumMessageSchema((key) => key)

export type ForumMessageFormValues = z.infer<typeof forumMessageSchema>
