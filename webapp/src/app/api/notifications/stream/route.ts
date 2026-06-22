import { getServerApiBaseUrl } from "@/lib/api-gateway"
import { getAuthHeaders } from "@/lib/server-session"

const API_BASE = getServerApiBaseUrl()

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${API_BASE}/v1/notifications/stream`, {
      method: "GET",
      headers: authHeaders,
      cache: "no-store",
      signal: request.signal,
    })
  } catch {
    return new Response("Notification stream unavailable", { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Notification stream unavailable", {
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
