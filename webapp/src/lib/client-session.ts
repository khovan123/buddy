import { getSession } from "next-auth/react"

export const getClientAuthHeaders = async () => {
  const session = await getSession()
  return session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : undefined
}
