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
import { useI18n } from "@/i18n/language-provider"

/* ------------------------------------------------------------------ */
/*  Contact cards — main view                                          */
/* ------------------------------------------------------------------ */

type ContactView = "main" | "sales" | "support"

export function ContactCards({
  onNavigate,
}: {
  onNavigate: (v: ContactView) => void
}) {
  const { t } = useI18n()

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-6">
      <MotionHero delay={0}>
        <div className="text-center">
          <Badge
            variant="outline"
            className="mb-6 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
          >
            {t("intro.contact.badge")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {t("intro.contact.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            {t("intro.contact.description")}
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
              <CardTitle>{t("intro.contact.salesTitle")}</CardTitle>
              <CardDescription>
                {t("intro.contact.salesDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="rounded-full">
                {t("intro.contact.salesButton")} <ArrowRight className="ml-2 size-4" />
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
              <CardTitle>{t("intro.contact.supportTitle")}</CardTitle>
              <CardDescription>
                {t("intro.contact.supportDescription").replace("support@buddy.edu", "").trim()}{" "}
                <a
                  href="mailto:support@buddy.edu"
                  className="font-medium text-foreground underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  support@buddy.edu
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="rounded-full">
                {t("intro.contact.supportButton")} <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </MotionHero>
    </div>
  )
}
