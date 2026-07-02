"use client"

import { useState } from "react"

import Link from "next/link"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Palette, Star, Users } from "lucide-react"

import { FeatureValue } from "@/components/atoms/feature-value"
import { MotionHero, MotionSection } from "@/components/atoms/motion-primitives"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlanCard } from "@/features/intro/components/plan-card"
import type { PricingData } from "@/features/intro/services/intro.service"
import { cn } from "@/lib/utils"

import { hydratePricingData } from "../utils/pricing-content.data"

/* ------------------------------------------------------------------ */
/*  Pricing content — orchestrator                                     */
/* ------------------------------------------------------------------ */

interface PricingContentProps {
  data: PricingData | null
}

export function PricingContent({ data: rawData }: PricingContentProps) {
  const hydrated = rawData ? hydratePricingData(rawData) : null
  const [yearly, setYearly] = useState(false)

  if (!hydrated) {
    return (
      <div className="relative min-h-screen bg-pricing-surface text-foreground">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-24">
          <Card className="w-full rounded-2xl border-border shadow-none">
            <CardContent className="space-y-3 p-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Pricing is temporarily unavailable
              </h1>
              <p className="text-sm text-muted-foreground">
                We could not load live subscription plans from billing service.
                Please try again shortly.
              </p>
              <Button asChild className="mx-auto rounded-full">
                <Link href="/sign-up">Create an account</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { creatorPlans, studentPlans, comparisonCategories, faqItems } =
    hydrated

  return (
    <div className="relative min-h-screen bg-pricing-surface text-foreground">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 left-1/3 h-125 w-125 rounded-full bg-pricing-accent/15 blur-30"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.22, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-1/4 bottom-40 h-100 w-100 rounded-full bg-pricing-highlight/10 blur-25"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.18, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
      </div>

      <div className="relative">
        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="pt-20 pb-12 md:pt-28">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <MotionHero delay={0}>
              <Badge
                variant="outline"
                className="mb-6 rounded-full border-border px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
              >
                Pricing
              </Badge>
            </MotionHero>

            <MotionHero delay={0.1}>
              <h1 className="mx-auto max-w-3xl text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
                Plans that grow with your{" "}
                <span className="bg-linear-to-r from-pricing-gradient-from to-pricing-gradient-to bg-clip-text text-transparent">
                  ambition
                </span>
              </h1>
            </MotionHero>

            <MotionHero delay={0.2}>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                Whether you&apos;re sharing knowledge or seeking it — start free
                and upgrade when you&apos;re ready.
              </p>
            </MotionHero>

            {/* Billing toggle */}
            <MotionHero delay={0.3}>
              <div className="mt-10 ml-18 flex items-center justify-center gap-3">
                <Label
                  htmlFor="billing-toggle"
                  className={cn(
                    "cursor-pointer text-sm transition-colors",
                    !yearly ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Monthly
                </Label>
                <Switch
                  id="billing-toggle"
                  checked={yearly}
                  onCheckedChange={setYearly}
                />
                <Label
                  htmlFor="billing-toggle"
                  className={cn(
                    "cursor-pointer text-sm transition-colors",
                    yearly ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Yearly
                </Label>
                {/* {yearly && ( */}
                <Badge
                  className={cn(
                    "rounded-full border-pricing-success/30 text-xs transition-all duration-300 ease-in-out",
                    yearly
                      ? "bg-pricing-success-muted text-pricing-success"
                      : "border-transparent bg-transparent text-transparent"
                  )}
                >
                  Save 20%
                </Badge>
                {/* )} */}
              </div>
            </MotionHero>
          </div>
        </section>

        {/* ── Pricing cards in Tabs ───────────────────────────────── */}
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <Tabs defaultValue="creator" className="items-center">
              <MotionHero delay={0.35}>
                <TabsList className="mb-10 bg-secondary">
                  <TabsTrigger value="creator">
                    <Palette className="size-4" />
                    For Creators
                  </TabsTrigger>
                  <TabsTrigger value="student">
                    <Users className="size-4" />
                    For Students
                  </TabsTrigger>
                </TabsList>
              </MotionHero>

              <TabsContent value="creator">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="creator"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-6 md:grid-cols-2"
                  >
                    <PlanCard
                      plan={creatorPlans.free}
                      features={creatorPlans.features}
                      isPro={false}
                      yearly={yearly}
                      audienceIcon={creatorPlans.icon}
                    />
                    <PlanCard
                      plan={creatorPlans.pro}
                      features={creatorPlans.features}
                      isPro={true}
                      yearly={yearly}
                      audienceIcon={creatorPlans.icon}
                    />
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="student">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="student"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-6 md:grid-cols-2"
                  >
                    <PlanCard
                      plan={studentPlans.free}
                      features={studentPlans.features}
                      isPro={false}
                      yearly={yearly}
                      audienceIcon={studentPlans.icon}
                    />
                    <PlanCard
                      plan={studentPlans.pro}
                      features={studentPlans.features}
                      isPro={true}
                      yearly={yearly}
                      audienceIcon={studentPlans.icon}
                    />
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* ── Comparison table ───────────────────────────────────── */}
        <Separator className="bg-border" />
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <MotionSection className="mb-12 text-center" variant="fade-up">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Compare all features
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                A detailed breakdown of what&apos;s included in every plan.
              </p>
            </MotionSection>

            <MotionSection variant="fade-up" delay={0.15}>
              <Card className="overflow-hidden rounded-2xl border-border shadow-none">
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-175">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-65 px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                          Feature
                        </th>
                        <th className="px-4 py-4 text-center text-sm font-medium text-muted-foreground">
                          Creator Free
                        </th>
                        <th className="px-4 py-4 text-center text-sm font-medium">
                          <Badge
                            variant="outline"
                            className="rounded-full border-pricing-accent/30 bg-pricing-accent-muted text-xs font-semibold text-pricing-accent"
                          >
                            Creator Pro
                          </Badge>
                        </th>
                        <th className="px-4 py-4 text-center text-sm font-medium text-muted-foreground">
                          Student Free
                        </th>
                        <th className="px-4 py-4 text-center text-sm font-medium">
                          <Badge
                            variant="outline"
                            className="rounded-full border-pricing-highlight/30 bg-pricing-highlight-muted text-xs font-semibold text-pricing-highlight"
                          >
                            Student Pro
                          </Badge>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonCategories.map((cat) => (
                        <>
                          <tr key={cat.category}>
                            <td
                              colSpan={5}
                              className="px-6 pt-8 pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                            >
                              {cat.category}
                            </td>
                          </tr>
                          {cat.rows.map((row) => (
                            <tr
                              key={row.label}
                              className="border-b border-border/50 transition-colors hover:bg-muted/50"
                            >
                              <td className="px-6 py-3.5 text-sm text-foreground/70">
                                {row.label}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex justify-center">
                                  <FeatureValue value={row.creatorFree} />
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex justify-center">
                                  <FeatureValue value={row.creatorPro} />
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex justify-center">
                                  <FeatureValue value={row.studentFree} />
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex justify-center">
                                  <FeatureValue value={row.studentPro} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </MotionSection>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────── */}
        <Separator className="bg-border" />
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6">
            <MotionSection className="mb-12 text-center" variant="fade-up">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Frequently asked questions
              </h2>
            </MotionSection>

            <MotionSection variant="fade-up" delay={0.1}>
              <Accordion
                type="single"
                collapsible
                className="rounded-2xl border-border"
              >
                {faqItems.map((faq, idx) => (
                  <AccordionItem key={faq.q} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left text-base font-medium">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">{faq.a}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </MotionSection>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────── */}
        <Separator className="bg-border" />
        <section className="py-20">
          <MotionSection
            className="mx-auto max-w-3xl px-6 text-center"
            variant="fade-up"
          >
            <Star className="mx-auto mb-6 size-10 text-pricing-accent" />
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Start your journey today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join 100,000+ students and creators who trust Buddy for their
              learning and teaching needs.
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
            </div>
          </MotionSection>
        </section>
      </div>
    </div>
  )
}
