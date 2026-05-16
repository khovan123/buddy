import type { IconKey } from "@/features/intro/services/intro.service"

/**
 * Shared navigation configuration for all public-facing pages.
 * Centralized here so every page uses the same links and dropdowns.
 */

export const navItems = [
  {
    label: "Explore",
    dropdown: [
      {
        href: "/explore/resources",
        label: "Resources",
        description: "Study materials, notes, and documents",
        iconKey: "BookOpen",
      },
      {
        href: "/explore/tutorials",
        label: "Tutorials",
        description: "Step-by-step learning guides",
        iconKey: "GraduationCap",
      },
      {
        href: "/explore/resources/collections",
        label: "Collections",
        description: "Curated bundles by top creators",
        iconKey: "FolderOpen",
      },
    ],
  },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
] satisfies Array<{
  href?: string
  label: string
  dropdown?: Array<{
    href: string
    label: string
    description?: string
    iconKey?: IconKey
  }>
}>

export const navActions = [
  { href: "/login", label: "Login", variant: "ghost" as const },
  { href: "/sign-up", label: "Get Started", variant: "default" as const },
]
