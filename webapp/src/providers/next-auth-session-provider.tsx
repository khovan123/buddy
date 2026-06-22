"use client"

import { useEffect, type ReactNode } from "react"

import { SessionProvider, useSession } from "next-auth/react"

import { useDispatch, useSelector } from "react-redux"

import { clearToken, setToken } from "@/features/auth/store/auth-slice"
import type { AppDispatch, RootState } from "@/lib/redux/store"

function AuthTokenSync() {
  const dispatch = useDispatch<AppDispatch>()
  const currentToken = useSelector((state: RootState) => state.auth.token)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") {
      return
    }

    if (status === "authenticated" && session?.accessToken) {
      if (session.accessToken !== currentToken) {
        dispatch(setToken(session.accessToken))
      }
      return
    }

    if (currentToken) {
      dispatch(clearToken())
    }
  }, [currentToken, dispatch, session?.accessToken, status])

  return null
}

export function NextAuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthTokenSync />
      {children}
    </SessionProvider>
  )
}
