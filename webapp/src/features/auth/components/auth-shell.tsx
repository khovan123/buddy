import type { ReactNode } from "react"

import Link from "next/link"

import { ArrowLeft, BookOpenCheck, Layers3, ShieldCheck } from "lucide-react"

import { EducationUniverse } from "@/components/atoms/education-universe"
import { Badge } from "@/components/ui/badge"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"

type AuthShellProps = {
  children: ReactNode
}

export default async function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="grid min-h-[100dvh] overflow-hidden bg-background text-foreground lg:grid-cols-[minmax(0,1.08fr)_minmax(30rem,0.92fr)]">
      <section className="relative hidden overflow-hidden border-r border-border/70 bg-[#07161d] text-primary-foreground lg:block">
        <EducationUniverse variant="auth" />
        <div className="learning-grid absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-linear-to-t from-[#07161d] via-[#07161d]/35 to-transparent" />
        <div className="absolute inset-x-10 top-10 flex items-center justify-between">
          <Badge className="h-auto border-white/20 bg-white/12 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-white uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md">
            Buddy
          </Badge>
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md">
            <ShieldCheck className="size-3.5" />
            Private workspace
          </div>
        </div>
        <div className="absolute inset-x-10 bottom-10 space-y-7">
          <div className="max-w-xl space-y-4">
            <p className="text-xs font-bold tracking-[0.28em] text-white/62 uppercase">
              Course-first study system
            </p>
            <h1 className="text-5xl leading-[0.95] font-semibold tracking-tight text-white xl:text-6xl">
              Keep study work in one sharp place.
            </h1>
            <p className="max-w-md text-base leading-7 text-white/72">
              Build a library around classes, materials, notes, and decisions
              without losing the thread between sessions.
            </p>
          </div>
          <div className="grid max-w-xl grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/14 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
              <BookOpenCheck className="mb-5 size-5 text-white/78" />
              <p className="text-2xl font-semibold tracking-tight">18.6k</p>
              <p className="mt-1 text-xs font-medium text-white/58">
                indexed resources
              </p>
            </div>
            <div className="rounded-lg border border-white/14 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
              <Layers3 className="mb-5 size-5 text-white/78" />
              <p className="text-2xl font-semibold tracking-tight">42</p>
              <p className="mt-1 text-xs font-medium text-white/58">
                course clusters
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-[linear-gradient(160deg,color-mix(in_oklch,var(--card)_88%,transparent),color-mix(in_oklch,var(--secondary)_50%,transparent))] p-4 sm:p-6 md:p-10">
        <div className="learning-glass w-full max-w-md space-y-5 rounded-xl p-5 md:p-7">
          <Item
            asChild
            variant="default"
            size="xs"
            className="w-fit border border-border/60 bg-secondary/45 px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary"
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
