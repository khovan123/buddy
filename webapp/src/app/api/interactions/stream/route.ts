import { getAccessToken } from "@/lib/server-session"

const API_BASE = process.env.NEXT_API_BASE_URL || "http://127.0.0.1:3000"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 })
  }

  const upstream = await fetch(`${API_BASE}/v1/interactions/stream`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal: request.signal,
  })

  if (!upstream.ok || !upstream.body) {
    return new Response("Interaction stream unavailable", {
      status: upstream.status || 502,
    })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
