export type ForumTopic = {
  id: string
  title: string
  excerpt: string
  author: string
  tag: string
  replies: number
  views: string
  activity: string
  trending: boolean
}

export type ForumMessage = {
  id: string
  author: string
  message: string
  time: string
  tone: "primary" | "muted"
}

export type ForumBootstrap = {
  topics: ForumTopic[]
  messages: ForumMessage[]
}
