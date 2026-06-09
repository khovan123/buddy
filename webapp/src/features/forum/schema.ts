import z from "zod"

export const forumTopicSchema = z.object({
  majorId: z.string().min(1, "Major tag is required"),
  title: z
    .string()
    .trim()
    .min(3, "Topic title must be at least 3 characters")
    .max(160, "Topic title is too long"),
  excerpt: z
    .string()
    .trim()
    .min(10, "Topic body must be at least 10 characters")
    .max(1000, "Topic body is too long"),
})

export type ForumTopicFormValues = z.infer<typeof forumTopicSchema>

export const forumMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(1000, "Message is too long"),
})

export type ForumMessageFormValues = z.infer<typeof forumMessageSchema>
