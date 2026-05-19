"use client"

import Link from "next/link"

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  MessageSquareText,
  Search,
  Star,
  Upload,
} from "lucide-react"

import {
  MotionHero,
  MotionSection,
  MotionStagger,
} from "@/components/atoms/motion-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LandingData } from "@/features/intro/services/intro.service"

import { hydrateLandingData } from "../utils/landing-content.data"

interface LandingContentProps {
  seoDescription: string
  data: LandingData
}

const MVP_STEPS = [
  {
    icon: Search,
    title: "Find the right material fast",
    description:
      "Browse a focused library of resources, tutorials, and collections by learning goal instead of searching across scattered links.",
  },
  {
    icon: Upload,
    title: "Publish one useful resource",
    description:
      "Creators can share a practical tutorial or document first, then learn from real usage before building a full catalogue.",
  },
  {
    icon: MessageSquareText,
    title: "Ask questions from the content",
    description:
      "Learners can use the study assistant to turn uploaded material into grounded answers and revision prompts.",
  },
]

const LEARNING_SIGNALS = [
  "Can a learner find a relevant resource in under 2 minutes?",
  "Will a creator publish one useful item without onboarding help?",
  "Does the AI answer reduce the next study step for real course material?",
]

const DEFERRED_FEATURES = [
  "Advanced subscriptions and payout automation",
  "Large recommendation-model optimization",
  "Institution dashboards and custom integrations",
  "Complex gamification, badges, and social feeds",
]

export function LandingContent({
  seoDescription,
  data: rawData,
}: LandingContentProps) {
  const { features, stats, useCases, testimonials } =
    hydrateLandingData(rawData)

  return (
    <>
      <section className="relative isolate overflow-hidden bg-education-paper text-education-ink">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklch,var(--education-gold)_18%,transparent),transparent_28rem),radial-gradient(circle_at_80%_10%,color-mix(in_oklch,var(--education-sage)_15%,transparent),transparent_24rem),linear-gradient(135deg,color-mix(in_oklch,var(--card)_82%,transparent),color-mix(in_oklch,var(--education-paper)_86%,transparent))]" />
        <div className="absolute top-16 right-8 -z-10 hidden h-72 w-72 rounded-full border border-education-line md:block" />
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28">
          <div className="space-y-8">
            <MotionHero delay={0}>
              <Badge className="h-auto rounded-full bg-primary px-4 py-1.5 text-primary-foreground">
                Buddy MVP
              </Badge>
            </MotionHero>

            <MotionHero delay={0.12}>
              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl leading-[0.95] font-black tracking-tight md:text-7xl">
                  Learn from the exact material your course needs.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                  {seoDescription ||
                    "Buddy helps students discover practical learning resources, follow creator-made tutorials, and ask AI questions grounded in the material they are studying."}
                </p>
              </div>
            </MotionHero>

            <MotionHero delay={0.24}>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="px-6">
                  <Link href="/explore">
                    Try the learning flow <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-6">
                  <Link href="/sign-up">Join as early user</Link>
                </Button>
              </div>
            </MotionHero>
          </div>

          <MotionHero delay={0.18}>
            <div className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-[0_28px_70px_-48px_color-mix(in_oklch,var(--education-ink)_55%,transparent)] backdrop-blur">
              <div className="rounded-[1.5rem] bg-foreground p-5 text-background">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-sm font-semibold tracking-[0.3em] uppercase">
                    MVP loop
                  </span>
                  <BookOpen className="size-5 text-accent" />
                </div>
                <div className="space-y-4">
                  {MVP_STEPS.map((step, index) => (
                    <article
                      key={step.title}
                      className="rounded-2xl border border-background/10 bg-background/[0.06] p-4"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                          {index + 1}
                        </span>
                        <step.icon className="size-5 text-accent" />
                      </div>
                      <h2 className="text-lg font-semibold">{step.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-background/70">
                        {step.description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </MotionHero>
        </div>
      </section>

      <section className="bg-background py-18 md:py-24">
        <div className="mx-auto max-w-7xl space-y-10 px-6">
          <MotionSection className="max-w-3xl" variant="fade-up">
            <Badge variant="outline" className="mb-4 h-auto px-3 py-1">
              Core value
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              One usable learning path, not a feature catalogue.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              The MVP keeps only the actions needed to validate demand: discover
              content, publish a first resource, and ask a grounded study
              question.
            </p>
          </MotionSection>

          <MotionStagger
            className="grid gap-5 md:grid-cols-3"
            staggerDelay={0.1}
            variant="fade-up"
          >
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[0_18px_42px_-34px_color-mix(in_oklch,var(--education-ink)_44%,transparent)]"
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section className="border-y border-border bg-muted/35 py-18 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <MotionSection
            className="rounded-3xl border border-border bg-background p-8"
            variant="fade-up"
          >
            <Badge className="mb-5 h-auto px-3 py-1">Validate next</Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              Feedback questions built into the release.
            </h2>
            <div className="mt-6 space-y-4">
              {LEARNING_SIGNALS.map((signal) => (
                <div key={signal} className="flex gap-3">
                  <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" />
                  <p className="leading-7 text-muted-foreground">{signal}</p>
                </div>
              ))}
            </div>
          </MotionSection>

          <MotionStagger
            className="grid gap-4 sm:grid-cols-3"
            staggerDelay={0.1}
            variant="scale-in"
          >
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-3xl border border-border bg-background p-6"
              >
                <stat.icon className="mb-6 size-6 text-primary" />
                <p className="text-4xl font-black tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {stat.label}
                </p>
              </article>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section className="bg-background py-18 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-2">
          <MotionSection variant="fade-up">
            <Badge variant="outline" className="mb-4 h-auto px-3 py-1">
              Not in MVP
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              Explicitly deferred so the first release can teach us something.
            </h2>
          </MotionSection>

          <MotionStagger
            className="grid gap-3"
            staggerDelay={0.08}
            variant="fade-up"
          >
            {DEFERRED_FEATURES.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border bg-card px-5 py-4 text-card-foreground"
              >
                {item}
              </div>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section className="border-y border-border bg-education-paper-strong py-18 md:py-24">
        <div className="mx-auto max-w-7xl space-y-10 px-6">
          <MotionSection className="max-w-3xl" variant="fade-up">
            <Badge variant="outline" className="mb-4 h-auto px-3 py-1">
              Evidence
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Keep every product signal visible before adding more scope.
            </h2>
          </MotionSection>

          <MotionStagger
            className="grid gap-5 md:grid-cols-3"
            staggerDelay={0.1}
            variant="fade-up"
          >
            {useCases.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[0_18px_42px_-34px_color-mix(in_oklch,var(--education-ink)_44%,transparent)]"
              >
                <p className="text-5xl font-black tracking-tighter text-primary">
                  {item.metric}
                </p>
                <p className="mt-1 text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
                  {item.metricLabel}
                </p>
                <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section className="bg-background py-18 md:py-24">
        <div className="mx-auto max-w-7xl space-y-10 px-6">
          <MotionSection className="max-w-3xl" variant="fade-up">
            <Badge variant="outline" className="mb-4 h-auto px-3 py-1">
              Learner voices
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Preserve qualitative feedback as part of the interface.
            </h2>
          </MotionSection>

          <MotionStagger
            className="grid gap-5 md:grid-cols-[1.2fr_0.9fr_1.05fr]"
            staggerDelay={0.1}
            variant="fade-up"
          >
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[0_18px_42px_-34px_color-mix(in_oklch,var(--education-ink)_44%,transparent)]"
              >
                <div className="flex gap-1 text-accent">
                  {Array.from(
                    { length: testimonial.rating },
                    (_, ratingStar) => ratingStar + 1
                  ).map((ratingStar) => (
                    <Star
                      key={`${testimonial.name}-${ratingStar}`}
                      className="size-4 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="mt-5 text-base leading-7 text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-6 border-t border-border/70 pt-4">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </article>
            ))}
          </MotionStagger>
        </div>
      </section>

      <section className="bg-foreground py-18 text-background md:py-24">
        <MotionSection
          className="mx-auto max-w-4xl px-6 text-center"
          variant="fade-up"
        >
          <Badge className="mb-5 h-auto bg-accent px-3 py-1 text-accent-foreground">
            Early access
          </Badge>
          <h2 className="text-4xl font-black tracking-tight md:text-6xl">
            Ship the first learning loop, then improve from real behavior.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-background/70">
            {useCases[0]?.description ??
              "Start with the smallest usable experience: one learner, one useful piece of content, and one clear next step."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent px-6 text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/sign-up">Create account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background/20 bg-transparent px-6 text-background hover:bg-background/10"
            >
              <Link href="/contact">Send MVP feedback</Link>
            </Button>
          </div>
        </MotionSection>
      </section>
    </>
  )
}
