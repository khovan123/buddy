import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ topicId: string }>
}

export async function PATCH(_request: Request, context: RouteContext) {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { topicId } = await context.params
  const upstream = await fetchApi(
    "PATCH",
    `/forum/topics/${topicId}/view`,
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
