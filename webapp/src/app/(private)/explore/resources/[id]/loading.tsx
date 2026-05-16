"use client"

import { Skeleton } from "boneyard-js/react"
import {
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  ShieldCheck,
  ShoppingCart,
  Star,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"

/**
 * Resource detail loading — wraps real layout markup in boneyard Skeleton.
 * Any layout changes to the real page are mirrored here structurally.
 */
export default function ResourceDetailLoading() {
  return (
    <Skeleton name="resource-detail" loading={true}>
      <section className="space-y-10 pb-12">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Course Category
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Resource Title Placeholder
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            A brief summary of the resource content goes here for layout sizing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Main column */}
          <div className="space-y-10 lg:col-span-8">
            {/* Hero image */}
            <Card className="group relative overflow-hidden rounded-2xl border-border/30 bg-card p-0 shadow-sm">
              <div className="relative aspect-4/5 w-full bg-muted">
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="size-16 text-muted-foreground/50" />
                </div>
              </div>
              <div className="absolute right-0 bottom-0 left-0 flex items-center justify-between border-t border-white/20 bg-white/80 px-8 py-6 backdrop-blur-md">
                <Item
                  variant="default"
                  size="sm"
                  className="w-auto border-0 bg-transparent p-0 text-sm font-medium text-foreground"
                >
                  <ItemMedia variant="icon">
                    <ShieldCheck className="size-5 text-primary" />
                  </ItemMedia>
                  <ItemTitle className="text-sm font-medium">
                    Preview limited to 3 pages.
                  </ItemTitle>
                </Item>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-bold text-primary hover:bg-transparent"
                >
                  View Preview
                </Button>
              </div>
            </Card>

            {/* Title + meta */}
            <div className="space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
                Resource Title Placeholder
              </h2>
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground">
                <Item
                  variant="default"
                  size="xs"
                  className="w-auto border-0 p-0"
                >
                  <ItemMedia variant="icon">
                    <Star className="size-4 fill-amber-500 text-amber-500" />
                  </ItemMedia>
                  <ItemTitle className="text-sm font-medium text-foreground">
                    0 orders
                  </ItemTitle>
                </Item>
                <Item
                  variant="default"
                  size="xs"
                  className="w-auto border-0 p-0"
                >
                  <ItemMedia variant="icon">
                    <ShoppingCart className="size-4 text-primary" />
                  </ItemMedia>
                  <ItemTitle className="text-sm font-medium text-muted-foreground">
                    0+ Downloads
                  </ItemTitle>
                </Item>
                <Item
                  variant="default"
                  size="xs"
                  className="w-auto border-0 p-0"
                >
                  <ItemMedia variant="icon">
                    <CalendarDays className="size-4" />
                  </ItemMedia>
                  <ItemTitle className="text-sm font-medium text-muted-foreground">
                    Updated —
                  </ItemTitle>
                </Item>
              </div>
            </div>

            {/* Creator card */}
            <div className="flex items-center justify-between rounded-xl border border-border/20 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-muted" />
                <div>
                  <p className="font-bold text-foreground">Creator Name</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Content Creator
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="font-bold text-primary hover:bg-primary/5"
              >
                Follow
              </Button>
            </div>

            {/* About section */}
            <div className="space-y-6 text-muted-foreground">
              <h3 className="text-2xl font-bold text-foreground">
                About this Resource
              </h3>
              <p className="text-lg leading-relaxed">
                A detailed description of the resource that provides enough text
                for the skeleton to capture realistic bone lengths and line
                spacing.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border/30 bg-background/70 px-3 py-2"
                  >
                    <CheckCircle2 className="size-5 text-primary" />
                    <span className="text-foreground">
                      Highlight item placeholder
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <Card className="rounded-2xl border border-border/20 bg-card p-8 shadow-sm">
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-foreground">
                    0 ₫
                  </span>
                </div>
                <div className="mb-8 space-y-4">
                  {[
                    { icon: FileText, label: "Format", value: "PDF" },
                    { icon: Database, label: "File Size", value: "—" },
                    {
                      icon: FileText,
                      label: "Total Pages",
                      value: "— documents",
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b border-border py-2 text-sm"
                    >
                      <Item
                        variant="default"
                        size="xs"
                        className="w-auto border-0 p-0"
                      >
                        <ItemMedia variant="icon">
                          <Icon className="size-4 text-muted-foreground" />
                        </ItemMedia>
                        <ItemTitle className="text-sm font-medium">
                          {label}
                        </ItemTitle>
                      </Item>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
                <Button className="mb-4 w-full text-base font-bold" size="lg">
                  Buy Now
                </Button>
                <div className="flex justify-center">
                  <Item
                    variant="default"
                    size="xs"
                    className="w-auto border-0 p-0 text-xs text-muted-foreground"
                  >
                    <ItemMedia variant="icon">
                      <ShieldCheck className="size-4" />
                    </ItemMedia>
                    <ItemTitle className="text-xs font-medium text-muted-foreground">
                      Secure encrypted payment
                    </ItemTitle>
                  </Item>
                </div>
                <CardContent className="mt-8 rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <p className="text-sm leading-tight font-semibold text-foreground">
                    Browse more resources in this subject.
                  </p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </section>
    </Skeleton>
  )
}
