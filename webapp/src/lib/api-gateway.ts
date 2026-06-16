export const DEFAULT_API_GATEWAY_URL =
  "https://api-gateway-622307400032.asia-southeast1.run.app"

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function isLocalApiGatewayUrl(value: string) {
  try {
    const url = new URL(value)
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)
  } catch {
    return false
  }
}

export function getServerApiBaseUrl() {
  return stripTrailingSlash(
    process.env.NEXT_API_BASE_URL || DEFAULT_API_GATEWAY_URL
  )
}

export function getClientApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

  if (!configured || isLocalApiGatewayUrl(configured)) {
    return ""
  }

  return stripTrailingSlash(configured)
}
