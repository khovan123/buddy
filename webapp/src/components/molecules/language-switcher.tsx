"use client"

import { Languages } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/language-provider"
import { cn } from "@/lib/utils"

interface LanguageSwitcherProps {
  compact?: boolean
  className?: string
}

export function LanguageSwitcher({
  compact = false,
  className,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n()
  const nextLocale = locale === "en" ? "vi" : "en"

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      className={cn("gap-1.5 rounded-full", className)}
      aria-label={`${t("common.language")}: ${
        locale === "en" ? t("common.english") : t("common.vietnamese")
      }`}
      title={`${t("common.language")}: ${
        locale === "en" ? t("common.english") : t("common.vietnamese")
      }`}
      onClick={() => setLocale(nextLocale)}
    >
      <Languages className="size-4" />
      {compact ? null : (
        <span className="text-xs font-semibold uppercase">{locale}</span>
      )}
    </Button>
  )
}
