"use client"

import Link from "next/link"

import { ArrowRight, Briefcase, MessageSquare, Star, Zap } from "lucide-react"

import { AnimatedCounter } from "@/components/atoms/animated-counter"
import {
  MotionHero,
  MotionSection,
  MotionStagger,
} from "@/components/atoms/motion-primitives"
import { UserAvatar } from "@/components/atoms/user-avatar"
import PixelTrail from "@/components/fancy/background/pixel-trail"
import MarqueeAlongSvgPath from "@/components/fancy/blocks/marquee-along-svg-path"
import StackingCards, {
  StackingCardItem,
} from "@/components/fancy/blocks/stacking-cards"
import BreathingText from "@/components/fancy/text/breathing-text"
import Letter3DSwap from "@/components/fancy/text/letter-3d-swap"
import TextHighlighter from "@/components/fancy/text/text-highlighter"
import Typewriter from "@/components/fancy/text/typewriter"
import VariableFontHoverByRandomLetter from "@/components/fancy/text/variable-font-hover-by-random-letter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LandingData } from "@/features/intro/services/intro.service"

import { hydrateLandingData } from "../utils/landing-content.data"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface LandingContentProps {
  seoDescription: string
  data: LandingData
}

export function LandingContent({
  seoDescription,
  data: rawData,
}: LandingContentProps) {
  const { features, stats, useCases, testimonials } =
    hydrateLandingData(rawData)
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background text-foreground">
        {/* Animated background blobs with Pixel Trail */}
        <div className="absolute inset-0 z-0">
          <PixelTrail
            pixelSize={32}
            fadeDuration={800}
            pixelClassName="bg-primary/5"
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-20 md:pt-28 md:pb-32">
          <div className="max-w-3xl space-y-8">
            {/* Trust badge */}
            <MotionHero delay={0}>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <UserAvatar
                    name="Alice"
                    className="size-8 border-2 border-background"
                  />
                  <UserAvatar
                    name="Bob"
                    className="size-8 border-2 border-background"
                  />
                  <UserAvatar
                    name="Carol"
                    className="size-8 border-2 border-background"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Trusted by 100K+ students across 50+ universities
                </p>
              </div>
            </MotionHero>

            {/* Main headline */}
            <MotionHero delay={0.15}>
              <h1 className="text-4xl leading-[1.1] font-bold tracking-tight md:text-6xl lg:text-7xl">
                <Letter3DSwap
                  staggerDuration={0.05}
                  staggerFrom="center"
                  rotateDirection="bottom"
                  frontFaceClassName="text-foreground"
                  secondFaceClassName="text-primary"
                >
                  Learning that drives
                </Letter3DSwap>{" "}
                <TextHighlighter
                  triggerType="inView"
                  highlightColor="hsl(var(--primary) / 0.2)"
                >
                  <BreathingText
                    fromFontVariationSettings="'wght' 400"
                    toFontVariationSettings="'wght' 800"
                    staggerDuration={0.1}
                    className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
                  >
                    real results
                  </BreathingText>
                </TextHighlighter>
              </h1>
            </MotionHero>

            <MotionHero delay={0.3}>
              <Typewriter
                as="p"
                text={
                  seoDescription ||
                  "A student-led marketplace connecting learners with curated resources, tutorials, and expert-created collections."
                }
                speed={30}
                className="block min-h-[60px] max-w-2xl text-lg text-muted-foreground md:text-xl"
                showCursor={true}
                loop={false}
              />
            </MotionHero>

            {/* CTA */}
            <MotionHero delay={0.45}>
              <div className="relative z-10 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="group rounded-full bg-foreground px-8 text-background hover:bg-foreground/90"
                >
                  <Link href="/explore">
                    <VariableFontHoverByRandomLetter
                      label="Explore Resources"
                      fromFontVariationSettings="'wght' 500, 'slnt' 0"
                      toFontVariationSettings="'wght' 900, 'slnt' -10"
                      className="mr-2 inline-block"
                    />{" "}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-border bg-transparent text-foreground hover:bg-accent"
                >
                  <Link href="/sign-up">Start for free</Link>
                </Button>
              </div>
            </MotionHero>
          </div>

          {/* Stats bar with animated counters */}
          <MotionStagger
            className="mt-16 grid grid-cols-2 gap-6 md:mt-24 md:grid-cols-4"
            staggerDelay={0.12}
            variant="scale-in"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur transition-all hover:border-border/80 hover:bg-accent/50"
              >
                <stat.icon className="mb-3 size-5 text-muted-foreground" />
                <AnimatedCounter
                  value={stat.value}
                  className="text-3xl font-bold text-foreground"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl space-y-16 px-6">
          <MotionSection className="text-center" variant="fade-up">
            <Badge
              variant="outline"
              className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            >
              Why Buddy
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              This is what modern learning looks like
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Bring knowledge, community, and your academic journey into one
              place so you can make a real impact.
            </p>
          </MotionSection>

          <StackingCards totalCards={features.length} className="w-full">
            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature, idx) => (
                <StackingCardItem
                  key={feature.title}
                  index={idx}
                  className="h-[250px] w-full sm:h-[300px]"
                >
                  <article className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
                    <div className="mb-4 flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <feature.icon className="size-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                      {feature.title}
                    </h3>
                    <p className="flex-grow text-base leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </article>
                </StackingCardItem>
              ))}
            </div>
          </StackingCards>
        </div>
      </section>

      {/* ── Techniques Marquee ───────────────────────────────────── */}
      <section className="overflow-hidden border-y border-border bg-background py-16">
        <div className="mx-auto mb-8 max-w-7xl px-6 text-center">
          <Badge
            variant="outline"
            className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
          >
            In Project
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Powered by the best techniques
          </h2>
        </div>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center">
          <MarqueeAlongSvgPath
            path="M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5"
            viewBox="0 0 996 330"
            baseVelocity={8}
            draggable={true}
            dragSensitivity={0.1}
            responsive
            repeat={4}
            slowdownOnHover={true}
            className="mt-10 h-full w-full scale-105"
            grabCursor
          >
            <div className="rounded-full border border-primary/20 bg-primary px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow-lg duration-300 ease-in-out hover:scale-150">
              Next.js
            </div>
            <div className="rounded-full border border-secondary/20 bg-secondary px-4 py-2 text-sm font-semibold whitespace-nowrap text-secondary-foreground shadow-lg duration-300 ease-in-out hover:scale-150">
              React
            </div>
            <div className="rounded-full border border-muted/20 bg-muted px-4 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground shadow-lg duration-300 ease-in-out hover:scale-150">
              Framer Motion
            </div>
            <div className="rounded-full border border-accent/20 bg-accent px-4 py-2 text-sm font-semibold whitespace-nowrap text-accent-foreground shadow-lg duration-300 ease-in-out hover:scale-150">
              Tailwind CSS
            </div>
            <div className="rounded-full border border-card/20 bg-card px-4 py-2 text-sm font-semibold whitespace-nowrap text-card-foreground shadow-lg duration-300 ease-in-out hover:scale-150">
              TypeScript
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/80 px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow-lg duration-300 ease-in-out hover:scale-150">
              Nest.js
            </div>
          </MarqueeAlongSvgPath>
        </div>
      </section>

      {/* ── Impact Metrics ──────────────────────────────────────── */}
      <section className="bg-background py-20 text-foreground md:py-28">
        <div className="mx-auto max-w-7xl space-y-16 px-6">
          <MotionSection className="text-center" variant="fade-up">
            <Badge
              variant="outline"
              className="mb-4 rounded-full border-border px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
            >
              Impact
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Learning that moves the numbers that matter
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Leading universities and student communities trust Buddy to
              deliver measurable learning outcomes.
            </p>
          </MotionSection>

          <MotionStagger
            className="grid gap-8 md:grid-cols-3"
            staggerDelay={0.15}
            variant="fade-up"
          >
            {useCases.map((item) => (
              <article
                key={item.metric}
                className="h-full rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-border/80"
              >
                <AnimatedCounter
                  value={item.metric}
                  className="mb-1 block bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-5xl font-bold text-transparent"
                />
                <p className="mb-4 text-sm text-muted-foreground">
                  {item.metricLabel}
                </p>
                <h3 className="mb-3 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </article>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ── CTA Duo ─────────────────────────────────────────────── */}
      <section className="bg-background py-20">
        <MotionStagger
          className="mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-2"
          staggerDelay={0.15}
          variant="scale-in"
        >
          <article className="rounded-3xl bg-primary p-10 text-primary-foreground transition-transform duration-300 hover:-translate-y-1">
            <Briefcase className="mb-4 size-8 opacity-80" />
            <h3 className="mb-3 text-2xl font-bold">Become a Creator</h3>
            <p className="mb-6 text-primary-foreground/80">
              Join over 2,500 creators who share their expertise and earn from
              their knowledge. Build your audience and make an impact.
            </p>
            <Button
              variant="secondary"
              asChild
              className="rounded-full"
              size="lg"
            >
              <Link href="/sign-up">Start Creating Today</Link>
            </Button>
          </article>
          <article className="rounded-3xl border border-border bg-card p-10 transition-transform duration-300 hover:-translate-y-1">
            <MessageSquare className="mb-4 size-8 text-primary opacity-80" />
            <h3 className="mb-3 text-2xl font-bold text-card-foreground">
              For Universities
            </h3>
            <p className="mb-6 text-muted-foreground">
              Equip your students with the best learning resources. Custom
              integrations and institutional dashboards available.
            </p>
            <Button asChild className="rounded-full" size="lg">
              <Link href="/about">Learn More</Link>
            </Button>
          </article>
        </MotionStagger>
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/30 py-20 md:py-28">
        <div className="mx-auto max-w-7xl space-y-16 px-6">
          <MotionSection className="text-center" variant="fade-up">
            <Badge
              variant="outline"
              className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            >
              Testimonials
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              What learners are saying
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Real feedback from students and creators using Buddy every day.
            </p>
          </MotionSection>

          <MotionStagger
            className="grid gap-6 md:grid-cols-3"
            staggerDelay={0.12}
            variant="fade-up"
          >
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="h-full rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
                <blockquote className="mb-6 text-sm leading-relaxed text-card-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={testimonial.name}
                    className="size-10 border border-border"
                  />
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="bg-background py-20 text-foreground md:py-28">
        <MotionSection
          className="mx-auto max-w-3xl px-6 text-center"
          variant="fade-up"
        >
          <Zap className="mx-auto mb-6 size-10 text-purple-400" />
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Ready to transform how you learn?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join 100,000+ students who are already learning smarter with Buddy.
            Free to start, powerful to grow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-foreground px-10 text-background hover:bg-foreground/90"
            >
              <Link href="/sign-up">
                Get Started Free <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-border bg-transparent text-foreground hover:bg-accent"
            >
              <Link href="/explore">Browse Resources</Link>
            </Button>
          </div>
        </MotionSection>
      </section>
    </>
  )
}
