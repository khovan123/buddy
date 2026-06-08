import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ topicId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = (await request.json()) as {
    reaction?: "like" | "tym" | "haha"
  }

  if (
    body.reaction !== "like" &&
    body.reaction !== "tym" &&
    body.reaction !== "haha"
  ) {
    return new Response("Invalid reaction", { status: 400 })
  }

  const { topicId } = await context.params
  const upstream = await fetchApi(
    "POST",
    `/forum/topics/${topicId}/reactions`,
    { reaction: body.reaction },
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
