"use client"

import { Skeleton } from "boneyard-js/react"

import { SectionHeading } from "@/components/atoms/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Explore page loading — wraps mock layout in boneyard Skeleton.
 * Mirrors the real ExplorePage structure so boneyard captures accurate bones.
 */
export default function ExploreLoading() {
  return (
    <Skeleton name="explore-page" loading={true}>
      <section className="space-y-10">
        {/* ── ExploreHero ── */}
        <header className="relative space-y-3 overflow-hidden rounded-2xl border border-white/5 bg-card/30 px-6 py-8 shadow-lg backdrop-blur-xl md:px-8 md:py-10">
          <div className="blur-20 pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-primary/20" />
          <div className="blur-20 pointer-events-none absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-accent/15" />
          <div className="relative z-10 flex flex-col items-start space-y-2.5">
            <Badge
              variant="outline"
              className="text-2xs h-auto rounded-full border-primary/20 bg-primary/10 px-3 py-1 font-semibold tracking-widest text-primary uppercase backdrop-blur-md"
            >
              Explore
            </Badge>
            <h1 className="text-2xl font-extrabold tracking-tighter text-foreground md:text-3xl lg:text-4xl">
              <span className="bg-linear-to-br from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-sm">
                Discover trending academic content
              </span>
            </h1>
            <p className="max-w-xl text-sm font-medium text-muted-foreground/90 md:text-base">
              Browse curated resources, tutorials, and collections tailored to
              your learning journey.
            </p>
          </div>
        </header>

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

        {/* ── Recommendation Section placeholder ── */}
        <section className="space-y-5 rounded-2xl border border-border/80 bg-primary/5 p-6">
          <SectionHeading
            badge="Just For You"
            title="Recommended for You"
            description="Personalized content based on your learning journey."
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
        <div className="space-y-12">
          {/* Marketplace header */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/30 p-6 shadow-2xl backdrop-blur-xl">
            <div className="blur-25 pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/20" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="text-2xs rounded-full border-primary/20 bg-primary/5 px-3 py-1 font-bold tracking-widest text-primary uppercase"
                >
                  Marketplace
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Overview
                </h2>
                <p className="max-w-xl text-muted-foreground">
                  Switch between study resources and tutorial content without
                  leaving the marketplace.
                </p>
              </div>
              <Tabs value="resources" className="w-full lg:w-auto">
                <TabsList className="h-12 w-full justify-start rounded-full bg-muted/50 p-1 lg:w-auto">
                  <TabsTrigger
                    value="resources"
                    className="rounded-full px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Resources
                  </TabsTrigger>
                  <TabsTrigger
                    value="tutorials"
                    className="rounded-full px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Tutorials
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </section>

          {/* Collections section */}
          <section className="space-y-8 rounded-3xl border border-white/5 bg-card/20 p-8 shadow-xl backdrop-blur-md">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-primary" />
                  <Badge
                    variant="outline"
                    className="text-2xs rounded-full border-border/80 px-2 py-0.5 font-semibold tracking-widest text-muted-foreground uppercase"
                  >
                    Curated
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold tracking-tighter">
                  <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-sm">
                    Top Resource Collections
                  </span>
                </h3>
                <p className="max-w-2xl text-muted-foreground">
                  Curated resource packs for faster exam prep and subject
                  mastery.
                </p>
              </div>
              <Button
                variant="outline"
                className="hidden rounded-full border-border/80 hover:bg-accent md:flex"
              >
                View All Collections
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          </section>

          {/* Trending content section */}
          <section className="space-y-8 rounded-3xl border border-white/5 bg-card/20 p-8 shadow-xl backdrop-blur-md">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-accent" />
                  <Badge
                    variant="outline"
                    className="text-2xs rounded-full border-border/80 px-2 py-0.5 font-semibold tracking-widest text-muted-foreground uppercase"
                  >
                    Popular
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold tracking-tighter">
                  <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-sm">
                    Trending Resources
                  </span>
                </h3>
                <p className="max-w-2xl text-muted-foreground">
                  Most viewed and highly rated resources this week.
                </p>
              </div>
              <Button
                variant="outline"
                className="hidden rounded-full border-border/80 hover:bg-accent md:flex"
              >
                View All Resources
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
