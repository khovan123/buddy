import { cookies } from "next/headers"

import NextAuth, { type AuthOptions } from "next-auth"

import type { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"

import { jwtDecode } from "jwt-decode"

import {
  CredentialPurpose,
  type LoginResponse,
  type RefreshTokenResponse,
  type VerifyOtpResponse,
} from "@/features/auth/type"
import { decodeAccessTokenClaims } from "@/lib/auth/role-access"
import { fetchApi } from "@/lib/fetch"
import { extractApiError, type ApiResponse } from "@/types/api"

async function saveAccessTokenCookie(token: string) {
  try {
    const decoded = jwtDecode<{ exp: number }>(token)
    const cookieStore = await cookies()
    cookieStore.set("accessToken", token, {
      path: "/",
      expires: new Date(decoded.exp * 1000),
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  } catch (error) {
    // Ignore error if invoked from within a Server Component (e.g. getServerSession)
  }
}
// Use globalThis to survive Next.js dev-mode hot reloads that re-evaluate modules
const globalForRefresh = globalThis as unknown as {
  __refreshPromises?: Map<string, Promise<JWT>>
}
if (!globalForRefresh.__refreshPromises) {
  globalForRefresh.__refreshPromises = new Map()
}
const refreshPromises = globalForRefresh.__refreshPromises

async function refreshAccessToken(
  token: JWT,
  options: { force?: boolean } = {}
): Promise<JWT> {
  const dedupeKey = token.user?.id || token.refreshToken
  if (options.force) {
    refreshPromises.delete(dedupeKey)
  }

  if (refreshPromises.has(dedupeKey)) {
    // logger.info(`[REFRESH] Reusing existing promise for user: ${dedupeKey}`)
    return refreshPromises.get(dedupeKey)!
  }

  const promise = (async () => {
    try {
      // logger.info(`[REFRESH] Starting token refresh for user: ${dedupeKey}`)
      const response = await fetchApi(
        "GET",
        "/auth/refresh",
        undefined,
        {
          Cookie: `refreshToken=${token.refreshToken}`,
        },
        false
      )

      const cookieHeader = response.headers.get("set-cookie")
      let newRefreshToken = token.refreshToken
      if (cookieHeader) {
        const match = cookieHeader.match(/refreshToken=([^;]+)/)
        if (match) {
          newRefreshToken = match[1]
        }
      }

      const data = (await response.json()) as ApiResponse<RefreshTokenResponse>

      if (!newRefreshToken && data.data?.refreshToken) {
        newRefreshToken = data.data.refreshToken
      }

      if (!response.ok) {
        throw new Error("Refresh failed")
      }

      const decoded = jwtDecode<{ exp: number }>(data.data.accessToken)
      const claims = decodeAccessTokenClaims(data.data.accessToken)

      await saveAccessTokenCookie(data.data.accessToken)

      // logger.info(
      //   `[REFRESH] Token refreshed successfully for user: ${dedupeKey}`
      // )

      setTimeout(() => refreshPromises.delete(dedupeKey), 30_000)

      return {
        ...token,
        accessToken: data.data.accessToken,
        refreshToken: newRefreshToken,
        expiresAt: decoded.exp * 1000,
        user: {
          ...token.user,
          role: token.user?.role ?? claims?.role ?? claims?.roles?.[0] ?? "",
          roles: token.user?.roles ?? claims?.roles,
          subscriptionPlan:
            claims?.subscriptionPlan ?? token.user?.subscriptionPlan ?? null,
        },
        error: undefined,
      }
    } catch (error) {
      // logger.error("[REFRESH] Failed to refresh token", error)
      refreshPromises.delete(dedupeKey)
      return {
        ...token,
        error: "[REFRESH_ACCESS_TOKEN_ERROR]",
      }
    }
  })()

  refreshPromises.set(dedupeKey, promise)

  return promise
}

/** OAuth provider names that route through the unified backend /auth/oauth endpoint. */
const OAUTH_PROVIDERS = ["google", "github"] as const

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.NEXT_GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHubProvider({
      clientId: process.env.NEXT_GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.NEXT_GITHUB_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
        otp: { label: "otp", type: "text" },
        purpose: { label: "purpose", type: "text" },
      },
      async authorize(credentials) {
        // ── OTP Verification flow ────────────────────────────────
        if (
          credentials?.otp &&
          credentials?.purpose === CredentialPurpose.VERIFY_OTP
        ) {
          const res = await fetchApi(
            "POST",
            "/auth/verify-otp",
            { email: credentials.email, otp: credentials.otp },
            {},
            false
          )

          const setCookieHeader = res.headers.get("set-cookie")
          let parsedRefreshToken = ""
          if (setCookieHeader) {
            const match = setCookieHeader.match(/refreshToken=([^;]+)/)
            if (match) {
              parsedRefreshToken = match[1]
            }
          }

          const result: unknown = await res.json()

          if (!res.ok) {
            throw new Error(extractApiError(result))
          }

          const data = result as ApiResponse<VerifyOtpResponse>
          await saveAccessTokenCookie(data.data.accessToken)

          if (!parsedRefreshToken && data.data?.refreshToken) {
            parsedRefreshToken = data.data.refreshToken
          }

          return {
            id: data.data.user.id,
            email: data.data.user.email,
            nickname: data.data.user.nickname,
            role: data.data.user.role,
            roles: data.data.user.roles,
            subscriptionPlan: data.data.user.subscriptionPlan ?? null,
            accessToken: data.data.accessToken,
            refreshToken: parsedRefreshToken,
          }
        }

        // ── Normal Login flow ────────────────────────────────────
        const res = await fetchApi(
          "POST",
          "/auth/login",
          {
            email: credentials?.email,
            password: credentials?.password,
          },
          {},
          false
        )

        const setCookieHeader = res.headers.get("set-cookie")
        let parsedRefreshToken = ""
        if (setCookieHeader) {
          const match = setCookieHeader.match(/refreshToken=([^;]+)/)
          if (match) {
            parsedRefreshToken = match[1]
          }
        }

        const result: unknown = await res.json()

        if (!res.ok) {
          throw new Error(extractApiError(result))
        }

        const data = result as ApiResponse<LoginResponse>

        // Backend says email not verified → redirect to OTP page
        if (data.data.requiresVerification) {
          throw new Error("[REQUIRES_VERIFICATION]")
        }

        await saveAccessTokenCookie(data.data.accessToken)

        if (!parsedRefreshToken && data.data?.refreshToken) {
          parsedRefreshToken = data.data.refreshToken
        }

        return {
          id: data.data.user.id,
          email: data.data.user.email,
          nickname: data.data.user.nickname,
          role: data.data.user.role,
          roles: data.data.user.roles,
          subscriptionPlan: data.data.user.subscriptionPlan ?? null,
          accessToken: data.data.accessToken,
          refreshToken: parsedRefreshToken,
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // ── OAuth provider flow (Google, GitHub, Facebook) ──────────
      if (
        account &&
        OAUTH_PROVIDERS.includes(
          account.provider as (typeof OAUTH_PROVIDERS)[number]
        )
      ) {
        try {
          // Determine the token to send to backend based on provider
          const providerToken =
            account.provider === "google"
              ? account.id_token
              : account.access_token

          const response = await fetchApi(
            "POST",
            "/auth/oauth",
            {
              provider: account.provider,
              providerToken,
            },
            undefined,
            false
          )

          const setCookieHeader = response.headers.get("set-cookie")
          let parsedRefreshToken = ""
          if (setCookieHeader) {
            const match = setCookieHeader.match(/refreshToken=([^;]+)/)
            if (match) {
              parsedRefreshToken = match[1]
            }
          }

          const json: unknown = await response.json()
          const data = json as ApiResponse<
            LoginResponse & { isNewUser?: boolean }
          >

          if (
            response.ok &&
            !data.data.requiresVerification &&
            data.data.accessToken
          ) {
            const decoded = jwtDecode<{ exp: number }>(data.data.accessToken)
            const claims = decodeAccessTokenClaims(data.data.accessToken)

            await saveAccessTokenCookie(data.data.accessToken)

            if (!parsedRefreshToken && data.data?.refreshToken) {
              parsedRefreshToken = data.data.refreshToken
            }

            token.accessToken = data.data.accessToken
            token.refreshToken = parsedRefreshToken
            token.expiresAt = decoded.exp * 1000
            token.user = {
              ...data.data.user,
              roles: claims?.roles ?? data.data.user.roles,
              subscriptionPlan:
                claims?.subscriptionPlan ?? data.data.user.subscriptionPlan ?? null,
            }
            token.isNewUser = data.data.isNewUser ?? false
          }
        } catch {
          token.error = `[${account.provider.toUpperCase()}_AUTH_ERROR]`
        }

        return token
      }

      // ── Credentials provider flow ──────────────────────────────
      if (user) {
        const u = user
        const decoded = jwtDecode<{ exp: number }>(u.accessToken ?? "")
        const claims = decodeAccessTokenClaims(u.accessToken)
        token.accessToken = u.accessToken ?? ""
        token.refreshToken = u.refreshToken ?? ""
        token.expiresAt = decoded.exp * 1000
        token.user = {
          id: u.id ?? "",
          email: u.email ?? "",
          role: u.role ?? claims?.role ?? claims?.roles?.[0] ?? "",
          roles: u.roles ?? claims?.roles,
          nickname: u.nickname ?? "",
          subscriptionPlan: u.subscriptionPlan ?? claims?.subscriptionPlan ?? null,
        }
        token.error = u.error
        token.isNewUser = false

        return token
      }

      if (token.error) {
        return token
      }

      if (trigger === "update") {
        return refreshAccessToken(token, { force: true })
      }

      // Nếu mất expiresAt hoặc đã quá hạn thì force refresh
      const shouldRefresh =
        !token.expiresAt ||
        typeof token.expiresAt !== "number" ||
        globalThis.Date.now() > token.expiresAt - 10000

      if (shouldRefresh) {
        return refreshAccessToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.user = token.user
      session.error = token.error
      session.isNewUser = token.isNewUser
      return session
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
