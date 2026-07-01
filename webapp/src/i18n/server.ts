import { cookies } from "next/headers"

import {
  createTranslator,
  normalizeLocale,
  type Locale,
} from "@/i18n/dictionary"

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const locale = cookieStore.get("buddy_locale")?.value

  return normalizeLocale(locale)
}

export async function getServerTranslator() {
  const locale = await getServerLocale()

  return {
    locale,
    t: createTranslator(locale),
  }
}
