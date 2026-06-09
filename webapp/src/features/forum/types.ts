export type ForumTopic = {
  id: string
  title: string
  excerpt: string
  author: string
  tag: string
  majorId?: string
  replies: number
  views: string
  viewCount: number
  reactions?: ForumTopicReactions
  viewerReaction?: ForumTopicReaction
  activity: string
  trending: boolean
}

export type ForumTopicReaction = "like" | "tym" | "haha"

export type ForumTopicReactions = Record<ForumTopicReaction, number>

export type ForumMention = {
  userId: string
  name: string
  username?: string
  avatarUrl?: string
}

export type ForumMessage = {
  id: string
  topicId?: string
  author: string
  message: string
  time: string
  tone: "primary" | "muted"
  mentions?: ForumMention[]
}

export type ForumBootstrap = {
  topics: ForumTopic[]
  messages: ForumMessage[]
  topicMessages: Record<string, ForumMessage[]>
}

export type ForumMentionCandidate = ForumMention
