"use client"

import Link from "next/link"

import { motion } from "framer-motion"
import { ArrowRight, Globe, GraduationCap, MapPin } from "lucide-react"

import {
  MotionHero,
  MotionSection,
  MotionStagger,
} from "@/components/atoms/motion-primitives"
import { UserAvatar } from "@/components/atoms/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { AboutData } from "@/features/intro/services/intro.service"

import { hydrateAboutData } from "../utils/about-content.data"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AboutContentProps {
  data: AboutData
}

export function AboutContent({ data: rawData }: AboutContentProps) {
  const { values, team, advisors, milestones, offices } =
    hydrateAboutData(rawData)
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* ── Hero — Quartr-style quote hook ──────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 right-1/4 h-100 w-100 rounded-full bg-primary/5 blur-25"
            animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-6">
          <MotionHero delay={0}>
            <Badge
              variant="outline"
              className="mb-8 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            >
              About Buddy
            </Badge>
          </MotionHero>

          <MotionHero delay={0.15}>
            <h1 className="text-4xl leading-[1.15] font-bold tracking-tight md:text-5xl lg:text-6xl">
              <span className="text-muted-foreground">&ldquo;</span>
              Why hasn&apos;t this existed before?
              <span className="text-muted-foreground">&rdquo;</span>
            </h1>
          </MotionHero>

          <MotionHero delay={0.3}>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              A common reaction from first-time users since day one.
            </p>
          </MotionHero>
        </div>
      </section>

      {/* ── Our Story ───────────────────────────────────────────── */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="mx-auto max-w-3xl space-y-8 px-6">
          <MotionSection variant="fade-up">
            <p className="text-lg leading-relaxed text-foreground/90">
              For too long, education has been obsessed with institutions.
              Degrees, certifications, formal programs — all designed to create
              a sense of credibility in a competitive world. But formal
              education alone doesn&apos;t tell the full story. It never has.
            </p>
          </MotionSection>

          <MotionSection variant="fade-up" delay={0.1}>
            <p className="text-lg leading-relaxed text-foreground/90">
              The most valuable knowledge — the kind that shapes careers, builds
              skills, and separates the truly capable from the merely
              credentialed — often lives in the experiences of peers. In the
              practical tutorials a senior student creates after struggling
              through a course. In the curated resource collection that saves
              hundreds from the same confusion. In the honest review that helps
              you choose what to learn next.
            </p>
          </MotionSection>

          <MotionSection variant="fade-up" delay={0.15}>
            <p className="text-lg leading-relaxed text-foreground/90">
              This was the fundamental insight when we started Buddy. We exist
              to bring efficiency and precision to learning — because the best
              educational resources are often created by those closest to the
              learning experience, not those furthest from it.
            </p>
          </MotionSection>

          <MotionSection variant="fade-up" delay={0.2}>
            <p className="text-lg leading-relaxed text-foreground/90">
              We strip away the noise. We help you zero in on what truly
              matters. We make sure the most valuable learning content is
              accessible, searchable, and actionable. No more wasted hours
              sifting through outdated slides and irrelevant PDFs. No more
              missing the resource that would have saved your semester.
            </p>
          </MotionSection>

          <MotionSection variant="fade-up" delay={0.25}>
            <p className="text-lg leading-relaxed font-medium text-foreground">
              Institutions are important. But understanding is what matters.
              That&apos;s why over 100,000 students and creators now rely on
              Buddy to learn and teach smarter.
            </p>
          </MotionSection>
        </div>
      </section>

      {/* ── Values ──────────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/30 py-20 md:py-28">
        <div className="mx-auto max-w-7xl space-y-16 px-6">
          <MotionSection className="text-center" variant="fade-up">
            <Badge
              variant="outline"
              className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            >
              Our Values
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              What we believe in
            </h2>
          </MotionSection>

          <MotionStagger
            className="grid gap-6 md:grid-cols-2"
            staggerDelay={0.1}
            variant="fade-up"
          >
            {values.map((value) => (
              <Card
                key={value.title}
                className="group h-full rounded-2xl border-border shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <value.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ── Timeline ────────────────────────────────────────────── */}
      <section className="border-t border-border py-20 md:py-28">
        <div className="mx-auto max-w-3xl space-y-16 px-6">
          <MotionSection className="text-center" variant="fade-up">
            <Badge
              variant="outline"
              className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            >
              Our Journey
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              From university project to platform
            </h2>
          </MotionSection>

          <MotionSection variant="fade-up" delay={0.1}>
            <div className="relative space-y-0">
              <div className="absolute top-2 bottom-2 left-4 w-px bg-border" />
              {milestones.map((milestone, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  className="relative flex gap-6 pb-8 last:pb-0"
                >
                  <div className="relative z-10 mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                    <div className="size-2.5 rounded-full bg-primary" />
                  </div>
                  <div>
                    <Badge
                      variant="secondary"
                      className="mb-1 rounded-full text-xs"
                    >
                      {milestone.year}
                    </Badge>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {milestone.event}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </MotionSection>
        </div>
      </section>

      {/* ── Team ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/30 py-20 md:py-28">
        <div className="mx-auto max-w-7xl space-y-16 px-6">
          <MotionSection className="text-center" variant="fade-up">
            <Badge
              variant="outline"
              className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            >
              Team
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              The people behind Buddy
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              A team of educators, engineers, and builders obsessed with making
              learning better for everyone.
            </p>
          </MotionSection>

          <MotionStagger
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.08}
            variant="fade-up"
          >
            {team.map((member) => (
              <Card
                key={member.name}
                className="group h-full rounded-2xl border-border shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardHeader className="flex-row items-center gap-4">
                  <UserAvatar
                    name={member.name}
                    className="size-14 border border-border text-base"
                  />
                  <div>
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {member.role}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {member.bio}
                  </p>
                </CardContent>
              </Card>
            ))}
          </MotionStagger>

          {/* Advisors */}
          <MotionSection variant="fade-up" delay={0.1}>
            <Separator className="mb-12" />
            <h3 className="mb-8 text-center text-xl font-semibold">Advisors</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {advisors.map((advisor) => (
                <div
                  key={advisor.name}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <UserAvatar
                    name={advisor.name}
                    className="size-10 border border-border text-xs"
                  />
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      {advisor.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {advisor.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </MotionSection>
        </div>
      </section>

      {/* ── Offices ─────────────────────────────────────────────── */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl space-y-12 px-6">
          <MotionSection className="text-center" variant="fade-up">
            <Globe className="mx-auto mb-4 size-8 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Where to find us
            </h2>
          </MotionSection>

          <MotionStagger
            className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2"
            staggerDelay={0.1}
            variant="fade-up"
          >
            {offices.map((office) => (
              <Card
                key={office.city}
                className="rounded-2xl border-border shadow-none"
              >
                <CardHeader>
                  <div className="mb-1 flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <CardTitle className="text-base">{office.city}</CardTitle>
                  </div>
                  <Badge
                    variant="secondary"
                    className="w-fit rounded-full text-xs"
                  >
                    {office.label}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {office.address}
                  </p>
                </CardContent>
              </Card>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-primary py-20 text-primary-foreground md:py-28">
        <MotionSection
          className="mx-auto max-w-3xl px-6 text-center"
          variant="fade-up"
        >
          <GraduationCap className="mx-auto mb-6 size-10 opacity-80" />
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Join us in redefining education
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/70">
            Whether you want to learn, teach, or build with us — there&apos;s a
            place for you at Buddy.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="rounded-full px-8"
            >
              <Link href="/sign-up">
                Get Started <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/explore">Explore Resources</Link>
            </Button>
          </div>
        </MotionSection>
      </section>
    </div>
  )
}
