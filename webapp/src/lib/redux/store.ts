import { combineReducers, configureStore } from "@reduxjs/toolkit"
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist"
import createWebStorage from "redux-persist/lib/storage/createWebStorage"

const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItem(_key: string, value: any) {
      return Promise.resolve(value)
    },
    removeItem(_key: string) {
      return Promise.resolve()
    },
  }
}

const storage =
  typeof globalThis.window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage()

import authReducer from "../../features/auth/store/auth-slice"

import appDataReducer from "./app-data-slice"
import { baseApi } from "./base-api"

// ─────────────────────────────────────────────────────────────
// Persist config — only appData is persisted to localStorage
// ─────────────────────────────────────────────────────────────

const persistConfig = {
  key: "buddy",
  storage,
  whitelist: ["appData"],
}

const rootReducer = combineReducers({
  auth: authReducer,
  appData: appDataReducer,
  [baseApi.reducerPath]: baseApi.reducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
