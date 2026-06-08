import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = (await request.json()) as {
    message?: string
  }

  const text = body.message?.trim()

  if (!text) {
    return new Response("Invalid message", { status: 400 })
  }

  const upstream = await fetchApi("POST", "/forum/messages", {
    message: text,
  }, headers)

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  })
}
