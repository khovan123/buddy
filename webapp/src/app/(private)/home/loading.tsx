"use client"

import { Skeleton } from "boneyard-js/react"

import { MetaChip } from "@/components/atoms/meta-chip"
import { SectionHeading } from "@/components/atoms/section-heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Home page loading — wraps mock layout in boneyard Skeleton.
 * Mirrors the real HomePage structure so boneyard captures accurate bones.
 */
export default function HomeLoading() {
  return (
    <Skeleton name="home-page" loading={true}>
      <section className="space-y-14">
        {/* ── Welcome + SeoHero ── */}
        <section className="space-y-5">
          <SectionHeading
            badge="Wellcome"
            title="Let's find out"
            description="Track resources, collections, and the content your audience engages with the most."
          />
          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="space-y-5">
              <h1 className="text-3xl font-semibold tracking-tight text-card-foreground md:text-5xl">
                Discover trending academic content
              </h1>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                Browse curated resources, tutorials, and collections tailored to
                your learning journey and academic goals.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button>Start learning</Button>
                <Button variant="outline">View profile</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Quick Picks ── */}
        <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
          <SectionHeading
            badge="Quick Picks"
            title="Today's Highlights"
            description="Quickly access content streams with the highest engagement."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <article
                key={i}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-4">
                  <MetaChip>Resource</MetaChip>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                  Featured content title
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  A brief description of the featured content item.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto w-fit"
                >
                  Xem chi tiet
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* ── Trending Section placeholder ── */}
        <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
          <SectionHeading
            badge="Hot Right Now"
            title="Top Trending"
            description="Most interacted and highly rated content this week."
          />
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        </section>

        {/* ── Mode Switcher placeholder ── */}
        <div className="space-y-8">
          <section className="space-y-6 rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                  Overview
                </h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Switch between resources and tutorials without leaving your
                  page.
                </p>
              </div>
              <div className="flex h-10 w-56 rounded-md bg-muted" />
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Top Resource Collections
                </h2>
                <p className="text-sm text-muted-foreground">
                  Best performing curated resource packs across subjects.
                </p>
              </div>
            </div>
            <div className="grid items-stretch gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Trending Resources
                </h2>
                <p className="text-sm text-muted-foreground">
                  Most downloaded materials this week across faculties.
                </p>
              </div>
            </div>
            <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          </section>
        </div>
      </section>
    </Skeleton>
  )
}
