import { ArrowRight, Building2, Headphones } from "lucide-react"

import { MotionHero } from "@/components/atoms/motion-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/* ------------------------------------------------------------------ */
/*  Contact cards — main view                                          */
/* ------------------------------------------------------------------ */

type ContactView = "main" | "sales" | "support"

export function ContactCards({
  onNavigate,
}: {
  onNavigate: (v: ContactView) => void
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-12 px-6">
      <MotionHero delay={0}>
        <div className="text-center">
          <Badge
            variant="outline"
            className="mb-6 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
          >
            Contact
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Get in touch
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Get in touch with our partnership and support teams for demos,
            onboarding help, or product questions.
          </p>
        </div>
      </MotionHero>

      <MotionHero delay={0.15}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Sales card */}
          <Card
            className="group cursor-pointer rounded-2xl border-border shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            onClick={() => onNavigate("sales")}
          >
            <CardHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Building2 className="size-6 text-primary" />
              </div>
              <CardTitle>Contact sales</CardTitle>
              <CardDescription>
                Discuss your requirements, learn about custom plans, or request
                a demo for your institution.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="rounded-full">
                Contact sales <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Submit a ticket card */}
          <Card
            className="group cursor-pointer rounded-2xl border-border shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            onClick={() => onNavigate("support")}
          >
            <CardHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Headphones className="size-6 text-primary" />
              </div>
              <CardTitle>Submit a ticket</CardTitle>
              <CardDescription>
                Submit a ticket to our support team or email{" "}
                <a
                  href="mailto:support@buddy.edu"
                  className="font-medium text-foreground underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  support@buddy.edu
                </a>{" "}
                directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="rounded-full">
                Submit a ticket <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </MotionHero>
    </div>
  )
}
