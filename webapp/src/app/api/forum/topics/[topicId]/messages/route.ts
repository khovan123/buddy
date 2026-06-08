import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ topicId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { topicId } = await context.params
  const upstream = await fetchApi(
    "GET",
    `/forum/topics/${topicId}/messages`,
    undefined,
    headers
  )

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  })
}

export async function POST(request: Request, context: RouteContext) {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = (await request.json()) as {
    message?: string
    mentions?: Array<{ userId: string; name: string; avatarUrl?: string }>
  }
  const message = body.message?.trim()

  if (!message) {
    return new Response("Invalid message", { status: 400 })
  }

  const { topicId } = await context.params
  const upstream = await fetchApi(
    "POST",
    `/forum/topics/${topicId}/messages`,
    {
      message,
      mentions: Array.isArray(body.mentions) ? body.mentions : [],
    },
    headers
  )

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  })
}
