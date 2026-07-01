"use client"

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { useRouter } from "next/navigation"

import {
  createTranslator,
  normalizeLocale,
  type Locale,
  type TranslationKey,
} from "@/i18n/dictionary"

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readInitialLocale() {
  if (typeof document === "undefined") {
    return "vi" as Locale
  }

  const cookieLocale = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("buddy_locale="))
    ?.split("=")[1]
  const savedLocale = globalThis.localStorage?.getItem("buddy_locale")

  return normalizeLocale(savedLocale || cookieLocale)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale)

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    globalThis.localStorage?.setItem("buddy_locale", nextLocale)
    document.cookie = `buddy_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = nextLocale
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: createTranslator(locale),
    }),
    [locale, setLocale]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider")
  }

  return context
}
