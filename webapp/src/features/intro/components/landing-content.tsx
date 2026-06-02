"use client"

import Link from "next/link"

import {
  Atom,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Code2,
  Layers3,
  MessageSquare,
  Rocket,
  Search,
  Sparkles,
  Star,
  Zap,
} from "lucide-react"

import { AnimatedCounter } from "@/components/atoms/animated-counter"
import { EducationUniverse } from "@/components/atoms/education-universe"
import {
  MotionHero,
  MotionSection,
  MotionStagger,
} from "@/components/atoms/motion-primitives"
import { UserAvatar } from "@/components/atoms/user-avatar"
import MarqueeAlongSvgPath from "@/components/fancy/blocks/marquee-along-svg-path"
import BreathingText from "@/components/fancy/text/breathing-text"
import Letter3DSwap from "@/components/fancy/text/letter-3d-swap"
import TextHighlighter from "@/components/fancy/text/text-highlighter"
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
  const heroDescription =
    seoDescription ||
    "A student-led marketplace connecting learners with curated resources, tutorials, and expert-created collections."
  const statStyles = [
    {
      panel: "border-emerald-200/70 bg-emerald-50/80 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-50",
      icon: "bg-emerald-500 text-white",
      number: "text-emerald-700 dark:text-emerald-300",
    },
    {
      panel: "border-sky-200/70 bg-sky-50/80 text-sky-950 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-50",
      icon: "bg-sky-500 text-white",
      number: "text-sky-700 dark:text-sky-300",
    },
    {
      panel: "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-50",
      icon: "bg-amber-500 text-white",
      number: "text-amber-700 dark:text-amber-300",
    },
    {
      panel: "border-rose-200/70 bg-rose-50/80 text-rose-950 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-50",
      icon: "bg-rose-500 text-white",
      number: "text-rose-700 dark:text-rose-300",
    },
  ]
  const mvpCards = [
    {
      icon: Search,
      eyebrow: "Discover",
      title: "Find the first useful resource fast",
      description:
        "The MVP starts with searchable course material and curated tutorials, so a learner can land on a practical next step without browsing an endless catalog.",
    },
    {
      icon: Sparkles,
      eyebrow: "Study",
      title: "Ask from the material, not the whole internet",
      description:
        "Grounded answers keep the assistant focused on the resource a learner is using, turning a document or tutorial into a study companion.",
    },
    {
      icon: Rocket,
      eyebrow: "Publish",
      title: "Let one creator prove supply",
      description:
        "Creators can publish a focused resource, watch learner response, and improve the content before Buddy expands into larger marketplace mechanics.",
    },
  ]

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-[min(58rem,calc(100dvh-4rem))] overflow-hidden bg-[#06151b] text-foreground">
        <EducationUniverse variant="hero" className="opacity-95" />
        <div className="learning-grid absolute inset-0 opacity-42" />
        <div className="absolute inset-0 bg-linear-to-r from-[#06151b] via-[#06151b]/88 to-[#06151b]/22 lg:via-[#06151b]/58" />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-20 md:pt-28 md:pb-28">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
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
                    as="span"
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
                    highlightColor="color-mix(in oklch, var(--primary) 20%, transparent)"
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
                <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
                  {heroDescription}
                </p>
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

            <MotionHero delay={0.25} className="relative hidden min-h-116 lg:block">
              <div className="absolute right-0 bottom-4 grid w-72 gap-2">
                {[
                  { icon: BookOpen, label: "Curated knowledge" },
                  { icon: Code2, label: "Creator tutorials" },
                  { icon: Atom, label: "Connected learning paths" },
                ].map((signal) => (
                  <div
                    key={signal.label}
                    className="learning-glass flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground/85"
                  >
                    <signal.icon className="size-4 text-primary" />
                    {signal.label}
                  </div>
                ))}
              </div>
            </MotionHero>
          </div>

          {/* Stats lab with animated counters */}
          <div className="learning-glass relative isolate mt-16 overflow-hidden rounded-xl p-5 md:mt-20 md:p-7">
            <div className="absolute top-0 right-8 left-8 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                  Live MVP pulse
                </p>
                <h2 className="mt-2 max-w-xl text-2xl leading-tight font-bold tracking-tight text-card-foreground md:text-3xl">
                  Proof points from the first learning loop.
                </h2>
              </div>
              <div className="rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-medium text-muted-foreground">
                Built to measure, not decorate
              </div>
            </div>

            <MotionStagger
              className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4"
              staggerDelay={0.12}
              variant="scale-in"
            >
              {stats.map((stat, idx) => {
                const style = statStyles[idx % statStyles.length]

                return (
                  <div
                    key={stat.label}
                    className={`group flex h-full flex-col rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-1 ${style.panel}`}
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div
                        className={`flex size-11 items-center justify-center rounded-2xl shadow-sm ${style.icon}`}
                      >
                        <stat.icon className="size-5" />
                      </div>
                      <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-semibold text-current opacity-70">
                        signal {idx + 1}
                      </span>
                    </div>
                    <AnimatedCounter
                      value={stat.value}
                      className={`text-4xl font-black tracking-tight ${style.number}`}
                    />
                    <p className="mt-3 flex-1 text-sm leading-6 text-current opacity-75">
                      {stat.label}
                    </p>
                  </div>
                )
              })}
            </MotionStagger>
          </div>
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

          <MotionStagger
            className="grid auto-rows-fr items-stretch gap-6 md:grid-cols-2"
            staggerDelay={0.12}
            variant="fade-up"
          >
            {features.map((feature, idx) => (
              <article
                key={feature.title}
                className="group relative isolate flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/80 p-6 shadow-[0_22px_48px_-36px_color-mix(in_oklch,var(--education-ink)_50%,transparent)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-card"
              >
                <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent" />
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                    0{idx + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="mt-3 flex-1 text-base leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="size-4" />
                  Ready for the first learning loop
                </div>
              </article>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ── MVP Focus ───────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
          <MotionSection
            className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card/80 p-8 shadow-[0_22px_52px_-40px_color-mix(in_oklch,var(--education-ink)_45%,transparent)]"
            variant="fade-up"
          >
            <div>
              <Badge
                variant="outline"
                className="mb-5 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
              >
                MVP Scope
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Small release, sharp proof.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Buddy&apos;s first version should feel complete where it
                matters: a learner can find material, study with context, and a
                creator can publish the supply that makes the loop worth
                repeating.
              </p>
            </div>
            <div className="mt-8 grid auto-rows-fr gap-3 sm:grid-cols-3">
              {["Search", "Study", "Publish"].map((label) => (
                <div
                  key={label}
                  className="flex h-full items-center gap-2 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm font-medium text-card-foreground"
                >
                  <Layers3 className="size-4 text-primary" />
                  {label}
                </div>
              ))}
            </div>
          </MotionSection>

          <MotionStagger
            className="grid auto-rows-fr items-stretch gap-5 md:grid-cols-3"
            staggerDelay={0.12}
            variant="fade-up"
          >
            {mvpCards.map((card) => (
              <article
                key={card.title}
                className="group flex h-full flex-col rounded-3xl border border-border bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-card"
              >
                <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <card.icon className="size-5" />
                </div>
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                  {card.eyebrow}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-card-foreground">
                  {card.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
              </article>
            ))}
          </MotionStagger>
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
            className="grid auto-rows-fr items-stretch gap-8 md:grid-cols-3"
            staggerDelay={0.15}
            variant="fade-up"
          >
            {useCases.map((item) => (
              <article
                key={item.metric}
                className="flex h-full flex-col rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-border/80"
              >
                <AnimatedCounter
                  value={item.metric}
                  className="mb-1 block bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-5xl font-bold text-transparent"
                />
                <p className="mb-4 text-sm text-muted-foreground">
                  {item.metricLabel}
                </p>
                <h3 className="mb-3 text-lg font-semibold">{item.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
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
          className="mx-auto grid max-w-7xl auto-rows-fr items-stretch gap-6 px-6 md:grid-cols-2"
          staggerDelay={0.15}
          variant="scale-in"
        >
          <article className="flex h-full flex-col rounded-3xl bg-primary p-10 text-primary-foreground transition-transform duration-300 hover:-translate-y-1">
            <Briefcase className="mb-4 size-8 opacity-80" />
            <h3 className="mb-3 text-2xl font-bold">Become a Creator</h3>
            <p className="mb-6 flex-1 text-primary-foreground/80">
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
          <article className="flex h-full flex-col rounded-3xl border border-border bg-card p-10 transition-transform duration-300 hover:-translate-y-1">
            <MessageSquare className="mb-4 size-8 text-primary opacity-80" />
            <h3 className="mb-3 text-2xl font-bold text-card-foreground">
              For Universities
            </h3>
            <p className="mb-6 flex-1 text-muted-foreground">
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
            className="grid auto-rows-fr items-stretch gap-6 md:grid-cols-3"
            staggerDelay={0.12}
            variant="fade-up"
          >
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from(
                    { length: testimonial.rating },
                    (_, ratingStar) => ratingStar + 1
                  ).map((ratingStar) => (
                    <Star
                      key={`${testimonial.name}-${ratingStar}`}
                      className="size-4 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
                <blockquote className="mb-6 flex-1 text-sm leading-relaxed text-card-foreground">
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
