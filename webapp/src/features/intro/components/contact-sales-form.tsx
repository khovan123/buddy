"use client"

import { useState } from "react"

import { ArrowLeft, ArrowRight, Building2, Send } from "lucide-react"

import { MotionHero } from "@/components/atoms/motion-primitives"
import { UserAvatar } from "@/components/atoms/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/language-provider"

/* ------------------------------------------------------------------ */
/*  Sales form + testimonial sidebar                                   */
/* ------------------------------------------------------------------ */

export function ContactSalesForm({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-6 text-center">
        <MotionHero delay={0}>
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Send className="size-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{t("intro.contact.salesThanksTitle")}</h2>
          <p className="mt-3 text-muted-foreground">
            {t("intro.contact.salesThanksDescription")}
          </p>
          <Button
            variant="outline"
            className="mt-8 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 size-4" />
            {t("intro.contact.back")}
          </Button>
        </MotionHero>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-6">
      <MotionHero delay={0}>
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("intro.contact.back")}
        </button>
      </MotionHero>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <MotionHero delay={0.1}>
          <Card className="rounded-2xl border-border shadow-none">
            <CardHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t("intro.contact.salesFormTitle")}</CardTitle>
              <CardDescription>
                {t("intro.contact.salesFormDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  const event = e as unknown as Event
                  event.preventDefault()
                  setSubmitted(true)
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sales-first-name">{t("intro.contact.firstName")}</Label>
                    <Input id="sales-first-name" placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sales-last-name">{t("intro.contact.lastName")}</Label>
                    <Input id="sales-last-name" placeholder="Doe" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales-email">{t("intro.contact.workEmail")}</Label>
                  <Input
                    id="sales-email"
                    type="email"
                    placeholder="john@university.edu"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales-org">{t("intro.contact.organization")}</Label>
                  <Input
                    id="sales-org"
                    placeholder="University / Company name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales-role">{t("intro.contact.yourRole")}</Label>
                  <Select>
                    <SelectTrigger id="sales-role">
                      <SelectValue placeholder={t("intro.contact.selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professor">{t("intro.contact.roleProfessor")}</SelectItem>
                      <SelectItem value="admin">{t("intro.contact.roleAdmin")}</SelectItem>
                      <SelectItem value="department-head">{t("intro.contact.roleDepartmentHead")}</SelectItem>
                      <SelectItem value="it">{t("intro.contact.roleIt")}</SelectItem>
                      <SelectItem value="student-org">{t("intro.contact.roleStudentOrg")}</SelectItem>
                      <SelectItem value="other">{t("intro.contact.roleOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales-message">{t("intro.contact.helpQuestion")}</Label>
                  <Textarea
                    id="sales-message"
                    placeholder={t("intro.contact.helpPlaceholder")}
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full rounded-full">
                  {t("intro.contact.sendMessage")} <ArrowRight className="ml-2 size-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </MotionHero>

        {/* Testimonial sidebar */}
        <MotionHero delay={0.25}>
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <Card className="rounded-2xl border-border bg-muted/50 shadow-none">
              <CardContent className="pt-6">
                <blockquote className="text-sm leading-relaxed text-foreground/80 italic">
                  &ldquo;Buddy completely transformed how our university
                  distributes learning resources. The custom plan saved us
                  thousands of hours of administrative work.&rdquo;
                </blockquote>
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name="Prof. Nguyen"
                    className="size-10 border border-border"
                  />
                  <div>
                    <p className="text-sm font-semibold">Prof. Nguyen Van An</p>
                    <p className="text-xs text-muted-foreground">
                      Dean of CS, VNU
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-none">
              <CardContent className="space-y-3 pt-6">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {t("intro.contact.whatToExpect")}
                </p>
                {[
                  t("intro.contact.expectDemo"),
                  t("intro.contact.expectPricing"),
                  t("intro.contact.expectIntegration"),
                  t("intro.contact.expectOnboarding"),
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </MotionHero>
      </div>
    </div>
  )
}
