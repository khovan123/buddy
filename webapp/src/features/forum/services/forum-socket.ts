"use client"

import { getSession } from "next-auth/react";

import type {
  ForumBootstrap,
  ForumMention,
  ForumMessage,
  ForumTopic,
  ForumTopicReaction,
} from "@/features/forum/types";

type ForumSocketEvent =
  | { type: "forum.topic"; data: ForumTopic }
  | { type: "forum.message"; data: ForumMessage }
  | { type: "forum.presence"; data: { onlineUsers: number } }
  | { type: "forum.error"; error?: string; status?: number }

type ForumSocketResponse<T> = {
  id?: string
  type: "forum.response"
  ok: boolean
  status?: number
  data?: { data?: T } | T
  error?: string
}

type ForumSocketCommand =
  | { type: "forum.bootstrap"; payload?: never }
  | {
      type: "forum.topic.create"
      payload: {
        title: string
        excerpt: string
        majorId: string
        tag: string
      }
    }
  | {
      type: "forum.message.create"
      payload: {
        message: string
        mentions: ForumMention[]
      }
    }
  | {
      type: "forum.reply.create"
      payload: {
        topicId: string
        message: string
        mentions: ForumMention[]
      }
    }
  | {
      type: "forum.topic.view"
      payload: {
        topicId: string
      }
    }
  | {
      type: "forum.topic.react"
      payload: {
        topicId: string
        reaction: ForumTopicReaction
      }
    }

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

type ForumEventHandler = (event: ForumSocketEvent) => void

class ForumSocketClient {
  private socket: WebSocket | null = null
  private connectPromise: Promise<WebSocket> | null = null
  private pending = new Map<string, PendingRequest>()
  private handlers = new Set<ForumEventHandler>()

  async bootstrap() {
    return this.send<ForumBootstrap>({ type: "forum.bootstrap" })
  }

  async createTopic(payload: {
    title: string
    excerpt: string
    majorId: string
    tag: string
  }) {
    return this.send<ForumTopic>({
      type: "forum.topic.create",
      payload,
    })
  }

  async createMessage(payload: { message: string; mentions: ForumMention[] }) {
    return this.send<ForumMessage>({
      type: "forum.message.create",
      payload,
    })
  }

  async createReply(payload: {
    topicId: string
    message: string
    mentions: ForumMention[]
  }) {
    return this.send<ForumMessage>({
      type: "forum.reply.create",
      payload,
    })
  }

  async viewTopic(topicId: string) {
    return this.send<ForumTopic>({
      type: "forum.topic.view",
      payload: { topicId },
    })
  }

  async reactToTopic(topicId: string, reaction: ForumTopicReaction) {
    return this.send<ForumTopic>({
      type: "forum.topic.react",
      payload: { topicId, reaction },
    })
  }

  subscribe(handler: ForumEventHandler) {
    this.handlers.add(handler)
    void this.connect()

    return () => {
      this.handlers.delete(handler)
      if (this.handlers.size === 0 && this.pending.size === 0) {
        this.disconnect()
      }
    }
  }

  private async send<T>(command: ForumSocketCommand): Promise<T> {
    const socket = await this.connect()
    const id = globalThis.crypto.randomUUID()

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
      socket.send(
        JSON.stringify({
          id,
          ...command,
        })
      )
    })
  }

  private async connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return this.socket
    }

    if (this.connectPromise) {
      return this.connectPromise
    }

    this.connectPromise = this.openSocket()

    try {
      return await this.connectPromise
    } finally {
      this.connectPromise = null
    }
  }

  private async openSocket() {
    const session = await getSession()
    const token = session?.accessToken

    if (!token) {
      throw new Error("Forum socket requires an active session")
    }

    const socket = new WebSocket(
      `${getForumSocketUrl()}?token=${encodeURIComponent(token)}`
    )
    this.socket = socket

    socket.addEventListener("message", (event) => {
      this.handleMessage(event.data)
    })
    socket.addEventListener("close", () => {
      this.rejectPending(new Error("Forum socket closed"))
      if (this.socket === socket) {
        this.socket = null
      }
    })
    socket.addEventListener("error", () => {
      this.rejectPending(new Error("Forum socket error"))
    })

    return new Promise<WebSocket>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(socket), { once: true })
      socket.addEventListener(
        "error",
        () => reject(new Error("Forum socket connection failed")),
        { once: true }
      )
    })
  }

  private handleMessage(data: unknown) {
    const message = JSON.parse(String(data)) as
      | ForumSocketEvent
      | ForumSocketResponse<unknown>

    if (message.type === "forum.response") {
      if (!message.id) {
        return
      }

      const pending = this.pending.get(message.id)
      if (!pending) {
        return
      }

      this.pending.delete(message.id)
      if (message.ok) {
        pending.resolve(unwrapApiData(message.data))
      } else {
        pending.reject(
          new Error(message.error ?? "Forum socket request failed")
        )
      }
      return
    }

    this.handlers.forEach((handler) => handler(message as ForumSocketEvent))
  }

  private rejectPending(error: Error) {
    this.pending.forEach((pending) => pending.reject(error))
    this.pending.clear()
  }

  private disconnect() {
    this.socket?.close()
    this.socket = null
  }
}

function unwrapApiData<T>(payload: ForumSocketResponse<T>["data"]) {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data
  }

  return payload
}

function getForumSocketUrl() {
  const base =
    process.env.NEXT_SOCKET_URL ||
    process.env.NEXT_API_BASE_URL ||
    "http://127.0.0.1:3000"
  const url = new URL(base)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/v1/forum/ws"
  url.search = ""
  return url.toString()
}

export const forumSocket = new ForumSocketClient()
