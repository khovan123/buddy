import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"

export const dynamic = "force-dynamic"

export async function GET() {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  const upstream = await fetchApi("GET", "/forum", undefined, headers)

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  })
}
