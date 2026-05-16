import React from "react"

import Link from "next/link"

import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { resolveIcon } from "@/lib/icon-resolver"

import { NavigationAction, NavigationItem } from "../atoms/nav-dropdown-item"

/* ------------------------------------------------------------------ */
/*  Mobile sheet nav                                                   */
/* ------------------------------------------------------------------ */

export function MobileNav({
  brandLabel,
  brandHref,
  items,
  actions,
}: {
  brandLabel: string
  brandHref: string
  items: NavigationItem[]
  actions: NavigationAction[]
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <Link href={brandHref} className="text-lg font-semibold">
              {brandLabel}
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-1">
          {items.map((item) => {
            if (item.dropdown) {
              return (
                <div key={item.label}>
                  <p className="mb-1 px-3 pt-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    {item.label}
                  </p>
                  {item.dropdown.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      {link.iconKey &&
                        (() => {
                          const iconComponent = resolveIcon(link.iconKey)
                          return (
                            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                              {React.createElement(iconComponent, {
                                className: "size-4 text-primary",
                              })}
                            </div>
                          )
                        })()}
                      <div>
                        <p className="font-medium">{link.label}</p>
                        {link.description && (
                          <p className="text-xs text-muted-foreground">
                            {link.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href!}
                className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                {item.label}
              </Link>
            )
          })}
          {actions.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="flex flex-col gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.href}
                    asChild
                    variant={action.variant ?? "default"}
                    className="w-full"
                  >
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
