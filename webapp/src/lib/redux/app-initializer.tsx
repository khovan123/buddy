"use client"

import { useEffect } from "react"

import { useDispatch, useSelector } from "react-redux"

import { contentApi } from "@/features/content/services/content-api"
import { userApi } from "@/features/user/services/user-api"

import { setAppData } from "./app-data-slice"
import type { AppDispatch, RootState } from "./store"

// ─────────────────────────────────────────────────────────────
// AppInitializer
// Preloads shared metadata (majors, courses, careers, skills)
// into Redux on first mount or when data becomes stale (>5 min).
// Data is persisted via redux-persist, so subsequent page loads
// use cached values while a background refresh runs.
// ─────────────────────────────────────────────────────────────

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoaded, lastFetched } = useSelector(
    (s: RootState) => s.appData
  )

  useEffect(() => {
    const isStale =
      !lastFetched || new Date().getTime() - lastFetched > STALE_TIME

    if (!isLoaded || isStale) {
      void (async () => {
        try {
          const [metaResult, careersResult, skillsResult] = await Promise.all([
            dispatch(
              contentApi.endpoints.getContentMeta.initiate(undefined, {
                forceRefetch: true,
              })
            ),
            dispatch(
              userApi.endpoints.getCareers.initiate(undefined, {
                forceRefetch: true,
              })
            ),
            dispatch(
              userApi.endpoints.getSkills.initiate(undefined, {
                forceRefetch: true,
              })
            ),
          ])

          dispatch(
            setAppData({
              majors: metaResult.data?.data?.majors ?? [],
              courses: metaResult.data?.data?.courses ?? [],
              careers: careersResult.data?.data?.data ?? [],
              skills: skillsResult.data?.data?.data ?? [],
            })
          )
        } catch (error) {
          console.error("[AppInitializer] Failed to preload app data:", error)
        }
      })()
    }
  }, [dispatch, isLoaded, lastFetched])

  return <>{children}</>
}
