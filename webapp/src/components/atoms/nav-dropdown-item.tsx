import React from "react"

import Link from "next/link"

import { NavigationMenuLink } from "@/components/ui/navigation-menu"
import type { IconKey } from "@/features/intro/services/intro.service"
import { resolveIcon } from "@/lib/icon-resolver"

export type DropdownLink = {
  href: string
  label: string
  description?: string
  iconKey?: IconKey
}

export type NavigationItem =
  | { href: string; label: string; dropdown?: never }
  | { href?: string; label: string; dropdown: DropdownLink[] }

export type NavigationAction = {
  href: string
  label: string
  variant?: "default" | "ghost" | "secondary" | "outline"
}

export function NavDropdownItem({
  href,
  label,
  description,
  iconKey,
}: DropdownLink) {
  const iconComponent = iconKey ? resolveIcon(iconKey) : null

  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className="group/link flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 outline-none select-none hover:bg-accent focus:bg-accent"
        >
          {iconComponent && (
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover/link:bg-primary/20">
              {React.createElement(iconComponent, {
                className: "size-4 text-primary",
              })}
            </div>
          )}
          <div>
            <p className="text-sm leading-none font-medium text-foreground">
              {label}
            </p>
            {description && (
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
