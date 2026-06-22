"use client"

import { useState } from "react"

import Link from "next/link"

import { motion } from "framer-motion"
import { ArrowRight, BookOpen, Presentation } from "lucide-react"

import { MotionHero, MotionSection } from "@/components/atoms/motion-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StepContent } from "@/features/intro/components/how-it-works-step-content"
import { StepVisual } from "@/features/intro/components/how-it-works-step-visual"
import type { HowItWorksData } from "@/features/intro/services/intro.service"
import { hydrateHowItWorksData } from "@/features/intro/utils/how-it-works.data"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface HowItWorksContentProps {
  data: HowItWorksData
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function HowItWorksContent({ data: rawData }: HowItWorksContentProps) {
  const { learnerSteps, creatorSteps } = hydrateHowItWorksData(rawData)

  // Track the active step IDs to switch visuals
  const [activeLearnerStep, setActiveLearnerStep] = useState(
    learnerSteps[0]?.id
  )
  const [activeCreatorStep, setActiveCreatorStep] = useState(
    creatorSteps[0]?.id
  )

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="blur-25 absolute -top-20 left-1/4 h-100 w-100 rounded-full bg-primary/5"
            animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <MotionHero delay={0}>
            <Badge
              variant="outline"
              className="mb-8 rounded-full border-border px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
            >
              How It Works
            </Badge>
          </MotionHero>

          <MotionHero delay={0.15}>
            <h1 className="text-4xl leading-[1.1] font-bold tracking-tight md:text-6xl lg:text-7xl">
              From curious learner to{" "}
              <span className="text-primary">impactful creator</span>
            </h1>
          </MotionHero>

          <MotionHero delay={0.3}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Buddy seamlessly connects your study sessions with monetization
              opportunities. Discover how you can master your courses and earn
              from your expertise.
            </p>
          </MotionHero>
        </div>
      </section>

      {/* ── Sequence 1: Learner Journey ─────────────────────────── */}
      <section className="relative border-t border-border bg-muted/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24">
            {/* Left: Sticky Visual */}
            <div className="relative hidden lg:block">
              <div className="sticky top-0 flex h-screen items-center py-24">
                <div className="relative h-full w-full overflow-hidden rounded-3xl bg-muted/30">
                  {learnerSteps.map((step) => (
                    <StepVisual
                      key={step.id}
                      step={step}
                      isActive={activeLearnerStep === step.id}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Scrolling Steps */}
            <div className="pt-24 pb-32">
              <div className="mb-16 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <BookOpen className="size-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">The Learner Journey</h2>
              </div>

              <div className="space-y-0">
                {learnerSteps.map((step, index) => (
                  <StepContent
                    key={step.id}
                    step={step}
                    index={index}
                    onEnter={setActiveLearnerStep}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sequence 2: Creator Journey ─────────────────────────── */}
      <section className="relative border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24">
            {/* Left: Sticky Visual */}
            <div className="relative hidden lg:block">
              <div className="sticky top-0 flex h-screen items-center py-24">
                <div className="relative h-full w-full overflow-hidden rounded-3xl bg-muted/30">
                  {creatorSteps.map((step) => (
                    <StepVisual
                      key={step.id}
                      step={step}
                      isActive={activeCreatorStep === step.id}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Scrolling Steps */}
            <div className="pt-24 pb-32">
              <div className="mb-16 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Presentation className="size-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">The Creator Journey</h2>
              </div>

              <div className="space-y-0">
                {creatorSteps.map((step, index) => (
                  <StepContent
                    key={step.id}
                    step={step}
                    index={index}
                    onEnter={setActiveCreatorStep}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/30 py-24 text-center md:py-36">
        <MotionSection className="mx-auto max-w-3xl px-6" variant="fade-up">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Ready to experience it yourself?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Join the global community of students learning smarter and creators
            earning more.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-10">
              <Link href="/sign-up">
                Start for free <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-border bg-transparent text-foreground hover:bg-accent"
            >
              <Link href="/explore">Explore the library</Link>
            </Button>
          </div>
        </MotionSection>
      </section>
    </div>
  )
}
