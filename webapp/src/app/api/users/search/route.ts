import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"

export const dynamic = "force-dynamic"

type UserSearchItem = {
  userId?: string
  id?: string
  email?: string
  username?: string
  profile?: {
    nickname?: string
    avatarUrl?: string
  }
  nickname?: string
  avatarUrl?: string
}

function normalizeUsers(payload: unknown) {
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : payload
  const items =
    data && typeof data === "object" && "data" in data
      ? (data as { data?: unknown }).data
      : data

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item: UserSearchItem) => {
      const username = item.username ?? item.email?.split("@")[0] ?? ""
      return {
        userId: item.userId ?? item.id ?? "",
        name: username || item.profile?.nickname || item.nickname || "buddy",
        username,
        avatarUrl: item.profile?.avatarUrl ?? item.avatarUrl,
      }
    })
    .filter((item) => item.userId && item.name)
}

export async function GET(request: Request) {
  const headers = await getAuthHeaders()

  if (!headers.Authorization) {
    return new Response("Unauthorized", { status: 401 })
  }

  const searchParams = new URL(request.url).searchParams
  const search = searchParams.get("q")?.trim() ?? ""

  if (search.length < 1) {
    return Response.json({ data: [] })
  }

  const upstream = await fetchApi(
    "GET",
    `/users?search=${encodeURIComponent(search)}&page=1&limit=8`,
    undefined,
    headers
  )

  const payload = await upstream.json().catch(() => null)

  return Response.json(
    { data: normalizeUsers(payload) },
    { status: upstream.status }
  )
}
