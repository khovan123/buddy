"use client"

import Link from "next/link"

import { MotionHero } from "@/components/atoms/motion-primitives"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { FaqData } from "@/features/intro/services/intro.service"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FaqContentProps {
  data: FaqData
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function FaqContent({ data }: FaqContentProps) {
  return (
    <div className="relative min-h-screen bg-background pb-32 text-foreground">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-muted/10 pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="relative mx-auto max-w-5xl px-6">
          <MotionHero delay={0}>
            <Badge
              variant="outline"
              className="mb-8 rounded-full border-border px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
            >
              Support & Documentation
            </Badge>
          </MotionHero>

          <MotionHero delay={0.15}>
            <h1 className="text-4xl leading-[1.1] font-bold tracking-tight text-foreground md:text-6xl">
              Frequently Asked Questions
            </h1>
          </MotionHero>

          <MotionHero delay={0.3}>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Find answers to common questions about using Unibuddy, from
              getting started with an account to earning money as a creator.
            </p>
          </MotionHero>
        </div>
      </section>

      {/* ── Content Area ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-4 lg:gap-24">
          {/* ── Sidebar (Sticky) ─────────────────────────────────── */}
          <div className="col-span-1 hidden space-y-8 lg:sticky lg:top-32 lg:block">
            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                Categories
              </h3>
              <nav className="flex flex-col space-y-3">
                {data.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`#${category.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      document
                        .getElementById(category.id)
                        ?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
                  >
                    {category.title}
                  </Link>
                ))}
              </nav>
            </div>

            <Card className="rounded-2xl border-border shadow-xs" size="sm">
              <CardHeader>
                <CardTitle>Still need help?</CardTitle>
                <CardDescription className="text-justify text-sm tracking-tight">
                  Our support team is always available to help. Connect for
                  dedicated 1:1 support!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" className="w-full">
                  <Link href="/contact">Contact Support</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Main Accordions ──────────────────────────────────── */}
          <div className="col-span-1 space-y-16 lg:col-span-3">
            {data.categories.map((category) => (
              <div key={category.id} id={category.id} className="scroll-mt-32">
                <h2 className="mb-6 border-b border-border pb-4 text-2xl font-bold tracking-tight text-foreground">
                  {category.title}
                </h2>

                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem
                      key={`${category.id}-faq-${category.title}-${faq.q}`}
                      value={`${category.id}-faq-${index}`}
                      className="border-border px-1"
                    >
                      <AccordionTrigger className="text-left text-base leading-relaxed font-medium hover:text-primary">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-6 text-base leading-relaxed text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
