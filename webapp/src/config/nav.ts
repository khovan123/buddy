import type { IconKey } from "@/features/intro/services/intro.service"
import type { TranslationKey } from "@/i18n/dictionary"
import { createTranslator, normalizeLocale, type Locale } from "@/i18n/dictionary"

/**
 * Shared navigation configuration for all public-facing pages.
 * Centralized here so every page uses the same links and dropdowns.
 */

type NavItemConfig = {
  href?: string
  label: TranslationKey
  dropdown?: Array<{
    href: string
    label: TranslationKey
    description?: TranslationKey
    iconKey?: IconKey
  }>
}

const navItemConfig = [
  {
    label: "intro.nav.explore",
    dropdown: [
      {
        href: "/explore/resources",
        label: "intro.nav.resources",
        description: "intro.nav.resourcesDescription",
        iconKey: "BookOpen",
      },
      {
        href: "/explore/tutorials",
        label: "intro.nav.tutorials",
        description: "intro.nav.tutorialsDescription",
        iconKey: "GraduationCap",
      },
      {
        href: "/explore/resources/collections",
        label: "intro.nav.collections",
        description: "intro.nav.collectionsDescription",
        iconKey: "FolderOpen",
      },
    ],
  },
  { href: "/how-it-works", label: "intro.nav.howItWorks" },
  { href: "/about", label: "intro.nav.about" },
  { href: "/contact", label: "intro.nav.contact" },
  { href: "/pricing", label: "intro.nav.pricing" },
  { href: "/faq", label: "intro.nav.faq" },
] satisfies NavItemConfig[]

const navActionConfig = [
  { href: "/login", label: "intro.nav.login", variant: "ghost" as const },
  {
    href: "/sign-up",
    label: "intro.nav.getStarted",
    variant: "default" as const,
  },
] satisfies Array<{ href: string; label: TranslationKey; variant: "ghost" | "default" }>

export function getIntroNav(locale?: Locale | string | null) {
  const t = createTranslator(normalizeLocale(locale))

  return {
    navItems: navItemConfig.map((item) => ({
      ...item,
      label: t(item.label),
      dropdown: item.dropdown?.map((entry) => ({
        ...entry,
        label: t(entry.label),
        description: entry.description ? t(entry.description) : undefined,
      })),
    })),
    navActions: navActionConfig.map((action) => ({
      ...action,
      label: t(action.label),
    })),
  }
}
