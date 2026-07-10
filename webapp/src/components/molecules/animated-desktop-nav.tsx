import Link from "next/link"

import { motion } from "framer-motion"

import { BrandLogo } from "@/components/atoms/brand-logo"
import {
  NavDropdownItem,
  type NavigationAction,
  type NavigationItem,
} from "@/components/atoms/nav-dropdown-item"
import { ThemeToggleButton } from "@/components/atoms/theme-toggle-button"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

export const smoothTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
}

interface AnimatedDesktopNavProps {
  scrolled: boolean
  brandLabel: string
  brandHref: string
  items: NavigationItem[]
  actions: NavigationAction[]
  actionsPosition: "center" | "right"
  isItemActive: (item: NavigationItem) => boolean
  rightSlot?: React.ReactNode
}

export function AnimatedDesktopNav({
  scrolled,
  brandLabel,
  brandHref,
  items,
  actions,
  actionsPosition,
  isItemActive,
  rightSlot,
}: AnimatedDesktopNavProps) {
  return (
    <motion.div
      className={cn(
        "mx-auto hidden max-w-7xl items-center md:grid",
        "grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)] gap-2",
        scrolled
          ? "w-fit! border border-border/70 bg-background/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-xl"
          : "w-full bg-transparent"
      )}
      animate={{
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 12,
        paddingBottom: 12,
        borderRadius: scrolled ? 9999 : 0,
        boxShadow: scrolled
          ? "0 18px 40px -28px color-mix(in oklch, var(--education-ink) 45%, transparent)"
          : "0 0 0 0 rgba(0,0,0,0)",
      }}
      transition={smoothTransition}
    >
      {/* ── Left: Brand + divider ─────────────────────────────── */}
      <motion.div
        className={cn(
          "flex items-center gap-4",
          scrolled ? "justify-self-end" : "justify-self-start"
        )}
        transition={smoothTransition}
        layout="position"
      >
        <Link
          href={brandHref}
          aria-label={brandLabel}
          className="group mr-4 flex items-center whitespace-nowrap text-foreground"
        >
          <motion.div
            animate={{ width: 32, height: 32 }}
            transition={smoothTransition}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <BrandLogo
              priority
              className="size-full rounded-md object-cover shadow-sm"
            />
          </motion.div>
        </Link>

        <motion.div
          className="bg-border"
          animate={{
            opacity: scrolled ? 1 : 0,
            width: scrolled ? 1 : 0,
            height: scrolled ? 16 : 0,
          }}
          transition={smoothTransition}
        />
      </motion.div>

      {/* ── Center: Shadcn NavigationMenu ──────────────────────── */}
      <NavigationMenu className="justify-self-center">
        <NavigationMenuList className="gap-1">
          {items.map((item) => {
            const active = isItemActive(item)

            if (item.dropdown) {
              return (
                <NavigationMenuItem key={item.label}>
                  <NavigationMenuTrigger
                    className={cn(
                      "bg-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground data-popup-open:bg-secondary/70",
                      active && "font-semibold text-foreground"
                    )}
                  >
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-80 gap-1 p-2">
                      {item.dropdown.map((link) => (
                        <NavDropdownItem key={link.href} {...link} />
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )
            }

            return (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href!}
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                      active && "font-semibold text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )
          })}
        </NavigationMenuList>
      </NavigationMenu>

      {/* ── Right: Divider + Actions ──────────────────────────── */}
      <motion.div
        className={cn(
          "flex items-center gap-2",
          scrolled ? "justify-self-start" : "justify-self-end"
        )}
        animate={{ gap: 12 }}
        transition={smoothTransition}
        layout="position"
      >
        <motion.div
          className="bg-border"
          animate={{
            opacity: scrolled ? 1 : 0,
            width: scrolled ? 1 : 0,
            height: scrolled ? 16 : 0,
          }}
          transition={smoothTransition}
        />

        <ThemeToggleButton />

        {rightSlot}

        {actionsPosition === "right" &&
          actions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant={action.variant ?? "default"}
              size="sm"
              className={cn(
                "rounded-full whitespace-nowrap transition-all duration-300",
                "h-8 px-4 text-sm",
                action.variant === "default" && "shadow-sm hover:shadow-md"
              )}
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}

        {actionsPosition === "center" &&
          actions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant={action.variant ?? "default"}
              size="sm"
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
      </motion.div>
    </motion.div>
  )
}
