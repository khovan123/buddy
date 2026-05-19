import Link from "next/link"

import { motion } from "framer-motion"

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
        "hidden items-center md:grid",
        "grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)] gap-2",
        scrolled
          ? "w-fit! border border-border/70 bg-background/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-xl"
          : "bg-transparent"
      )}
      animate={{
        maxWidth: scrolled ? "auto" : 1280,
        width: "100%",
        marginLeft: "auto",
        marginRight: "auto",
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
          "flex items-center",
          scrolled ? "justify-self-end" : "justify-self-start"
        )}
        animate={{ gap: 16 }}
        transition={smoothTransition}
        layout="position"
      >
        <Link
          href={brandHref}
          className="group mr-4 whitespace-nowrap text-foreground"
        >
          <motion.span
            className="inline-block font-semibold tracking-tight"
            animate={{ fontSize: "18px" }}
            transition={smoothTransition}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {brandLabel}
          </motion.span>
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
