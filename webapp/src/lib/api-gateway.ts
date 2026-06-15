export const DEFAULT_API_GATEWAY_URL =
  "https://api-gateway-622307400032.asia-southeast1.run.app"

export function getServerApiBaseUrl() {
  return process.env.NEXT_API_BASE_URL || DEFAULT_API_GATEWAY_URL
}

export function getClientApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_GATEWAY_URL
}
