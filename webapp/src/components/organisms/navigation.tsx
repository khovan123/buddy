"use client"

import { useState } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useMotionValueEvent, useScroll } from "framer-motion"

import { BrandLogo } from "@/components/atoms/brand-logo"
import type {
  NavigationAction,
  NavigationItem,
} from "@/components/atoms/nav-dropdown-item"
import { ThemeToggleButton } from "@/components/atoms/theme-toggle-button"
import { AnimatedDesktopNav } from "@/components/molecules/animated-desktop-nav"
import { MobileNav } from "@/components/molecules/mobile-nav"
import { cn } from "@/lib/utils"

export type NavigationProps = {
  brandLabel: string
  brandHref?: string
  items: NavigationItem[]
  actions?: NavigationAction[]
  actionsPosition?: "center" | "right"
  navClassName?: string
  currentPath?: string
  rightSlot?: React.ReactNode
  containerClassName?: string
}

/* ------------------------------------------------------------------ */
/*  Main Navigation — orchestrator organism                            */
/* ------------------------------------------------------------------ */

const EMPTY_ACTIONS: NavigationAction[] = []

export function Navigation({
  brandLabel,
  brandHref = "/",
  items,
  actions = EMPTY_ACTIONS,
  actionsPosition = "center",
  currentPath,
  rightSlot,
  containerClassName,
}: NavigationProps) {
  const pathname = usePathname()
  const activePath = currentPath ?? pathname
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40)
  })

  const isItemActive = (item: (typeof items)[number]) => {
    if (item.dropdown) {
      return item.dropdown.some(
        (link) =>
          activePath === link.href || activePath.startsWith(`${link.href}/`)
      )
    }
    const href = item.href!
    if (href === "/") {
      return activePath === "/"
    }
    return activePath === href || activePath.startsWith(`${href}/`)
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full items-center justify-center px-4 transition-[padding] duration-500",
        scrolled ? "py-2" : "py-3",
        containerClassName
      )}
    >
      <AnimatedDesktopNav
        scrolled={scrolled}
        brandLabel={brandLabel}
        brandHref={brandHref}
        items={items}
        actions={actions}
        actionsPosition={actionsPosition}
        isItemActive={isItemActive}
        rightSlot={rightSlot}
      />

      {/* ── Mobile nav ──────────────────────────────────────────── */}
      <div className="flex w-full items-center justify-between md:hidden">
        <Link
          href={brandHref}
          aria-label={brandLabel}
          className="flex items-center"
        >
          <BrandLogo
            priority
            className="size-9 rounded-md object-cover shadow-sm"
          />
        </Link>
        <div className="flex items-center gap-2">
          {rightSlot}
          <ThemeToggleButton compact />
          <MobileNav
            brandLabel={brandLabel}
            brandHref={brandHref}
            items={items}
            actions={actions}
          />
        </div>
      </div>
    </div>
  )
}
