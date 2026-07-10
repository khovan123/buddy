"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/language-provider"

/** Reusable unauthenticated actions for a navigation bar. */
export function AuthNavigationActions() {
  const { t } = useI18n()

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link href="/login">{t("intro.nav.login")}</Link>
      </Button>
      <Button asChild size="sm" className="rounded-full shadow-sm hover:shadow-md">
        <Link href="/sign-up">{t("intro.nav.getStarted")}</Link>
      </Button>
    </>
  )
}
