import type { ReactNode } from "react"

import Link from "next/link"

import Spline from "@splinetool/react-spline"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"

type AuthShellProps = {
  children: ReactNode
}

export default async function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden border-r border-border/70 bg-education-paper-strong lg:block">
        <Spline scene="https://prod.spline.design/Ioxj4VUXw2cmqm2y/scene.splinecode" />
        <div className="absolute inset-0 bg-linear-to-br from-background/80 via-background/20 to-background/70" />
        <div className="absolute inset-x-8 bottom-8 rounded-4xl border border-border/70 bg-card/82 p-6 shadow-[0_24px_60px_-42px_color-mix(in_oklch,var(--education-ink)_55%,transparent)] backdrop-blur-xl">
          <Badge className="mb-4 h-auto px-4 py-1 text-xs font-bold tracking-[0.2em] uppercase">
            Buddy
          </Badge>
          <p className="max-w-sm text-2xl leading-tight font-semibold tracking-tighter">
            Study with course context, not scattered links.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-md space-y-6 rounded-4xl border border-border/70 bg-card/88 p-6 shadow-[0_24px_60px_-44px_color-mix(in_oklch,var(--education-ink)_55%,transparent)] backdrop-blur md:p-8">
          <Item
            asChild
            variant="default"
            size="xs"
            className="w-fit border-0 px-2 py-1"
          >
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ItemMedia variant="icon">
                <ArrowLeft className="size-4" />
              </ItemMedia>
              <ItemTitle className="text-sm font-medium">Back</ItemTitle>
            </Link>
          </Item>
          {children}
        </div>
      </section>
    </div>
  )
}
