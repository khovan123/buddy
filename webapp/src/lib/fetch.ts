const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_API_BASE_URL ||
  "http://127.0.0.1:3000"

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

/**
 * Server-side fetch wrapper that calls the API Gateway.
 * NOT for client components — use regular fetch in those.
 */
export async function fetchApi(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
  includeCredentials = false,
  customInit?: RequestInit
): Promise<Response> {
  const url = `${API_BASE}/v1${path}`

  const init: RequestInit = {
    method,
    headers: {
      ...headers,
    },
    ...customInit,
  }

  // Set default cache behavior if not overridden
  if (init.cache === undefined && init.next === undefined) {
    init.cache = "no-store"
  }

  if (includeCredentials) {
    init.credentials = "include"
  }

  if (body && method !== "GET") {
    ;(init.headers as Record<string, string>)["Content-Type"] =
      "application/json"
    init.body = JSON.stringify(body)
  }

  return fetch(url, init)
}
