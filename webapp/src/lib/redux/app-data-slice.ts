import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { Course, Major } from "@/features/content/types"
import type { CareerItem, SkillItem } from "@/types/shared"

// ─────────────────────────────────────────────────────────────
// App Data Slice — persisted global metadata
// Loaded once at app start, refreshed when stale (>5 min)
// ─────────────────────────────────────────────────────────────

export interface AppDataState {
  majors: Major[]
  courses: Course[]
  careers: CareerItem[]
  skills: SkillItem[]
  isLoaded: boolean
  lastFetched: number | null
}

const initialState: AppDataState = {
  majors: [],
  courses: [],
  careers: [],
  skills: [],
  isLoaded: false,
  lastFetched: null,
}

export const appDataSlice = createSlice({
  name: "appData",
  initialState,
  reducers: {
    setAppData(
      state,
      action: PayloadAction<
        Partial<Omit<AppDataState, "isLoaded" | "lastFetched">>
      >
    ) {
      Object.assign(state, action.payload)
      state.isLoaded = true
      state.lastFetched = new Date().getTime()
    },
    clearAppData() {
      return initialState
    },
  },
})

export const { setAppData, clearAppData } = appDataSlice.actions
export default appDataSlice.reducer
