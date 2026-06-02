import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    nickname?: string
    role?: string
    roles?: string[]
    subscriptionPlan?: string | null
    accessToken?: string
    refreshToken?: string
    error?: string
  }

  interface Session {
    accessToken: string
    user: {
      id: string
      email: string
      nickname: string
      role: string
      roles?: string[]
      subscriptionPlan?: string | null
    }
    error?: string
    isNewUser?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    refreshToken: string
    expiresAt: number
    user: {
      id: string
      email: string
      nickname: string
      role: string
      roles?: string[]
      subscriptionPlan?: string | null
    }
    error?: string
    isNewUser?: boolean
  }
}
