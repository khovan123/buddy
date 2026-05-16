import { getSession, signOut } from "next-auth/react"


import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query"
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

import { clearAuthCookies } from "@/features/auth/actions"
import { clearToken, setToken } from "@/features/auth/store/auth-slice"

import type { RootState } from "./store"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: async (headers, { getState }) => {
    let token = (getState() as RootState).auth.token

    // Khắc phục F5 mất token trong Redux: tự đi xin NextAuth bù vào
    if (!token) {
      const session = await getSession()
      if (session?.accessToken) {
        token = session.accessToken
      }
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    return headers
  },
})

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    const currentToken = (api.getState() as RootState).auth.token
    // Bỏ qua next-auth client cache bằng cách gọi trực tiếp API kèm theo ?update
    const res = await fetch("/api/auth/session?update=true", {
      cache: "no-store",
    })
    const session = res.ok ? await res.json() : null

    if (session?.accessToken && session.accessToken !== currentToken) {
      // Nếu NextAuth lấy được token mới (khác với token cũ đã bị 401), cập nhật cho Redux
      api.dispatch(setToken(session.accessToken))

      // Nộp lại request cũ
      result = await baseQuery(args, api, extraOptions)
    } else {
      // Refresh thất bại (hết hạn hoàn toàn hoặc NextAuth trả về token cũ) => xóa token
      api.dispatch(clearToken())

      await clearAuthCookies().catch(console.error)
      signOut({ redirect: true, callbackUrl: "/login" })
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Major",
    "Course",
    "Tutorial",
    "Collection",
    "Resource",
    "UserProfile",
    "Skill",
    "Career",
    "Wallet",
    "Transaction",
    "PayoutAccount",
    "Subscription",
  ], // Centralize tag definitions here
  endpoints: () => ({}),
})
