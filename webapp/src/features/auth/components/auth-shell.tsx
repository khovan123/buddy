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
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden border-r border-border bg-muted lg:block">
        <Spline scene="https://prod.spline.design/Ioxj4VUXw2cmqm2y/scene.splinecode" />
        <div className="absolute inset-0 bg-linear-to-br from-background/40 via-background/10 to-background/60" />
        <Badge className="absolute right-4 bottom-4.5 px-8 py-5 text-2xl font-black uppercase">
          Buddy
        </Badge>
      </section>
      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
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
