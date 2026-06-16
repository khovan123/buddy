import type { ReactNode } from "react"

import { CheckCircle2, MinusCircle, Target } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { LearningFit } from "../types"

import { StartHereSteps } from "./start-here-steps"
import { VerifiedFitBadge } from "./verified-fit-badge"

interface HonestFitCardProps {
  fit?: LearningFit | null
  contentType: "resource" | "tutorial" | "collection"
  analyticsPayload?: Record<
    string,
    boolean | number | string | null | undefined
  >
}

function FitList({
  icon,
  title,
  items,
}: {
  icon: ReactNode
  title: string
  items?: string[]
}) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HonestFitCard({
  fit,
  contentType,
  analyticsPayload,
}: HonestFitCardProps) {
  const hasFit = Boolean(
    fit &&
    (fit.bestFor.length > 0 ||
      fit.notFor.length > 0 ||
      fit.startHere.length > 0)
  )

  if (!hasFit || !fit) {
    return null
  }

  const noun =
    contentType === "collection"
      ? "learning path"
      : contentType === "tutorial"
        ? "tutorial"
        : "resource"

  return (
    <Card className="rounded-lg border-primary/20 bg-background/95">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Honest fit for this {noun}
          </CardTitle>
          <VerifiedFitBadge fit={fit} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <FitList
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          title="Best for"
          items={fit.bestFor}
        />
        <FitList
          icon={<MinusCircle className="h-4 w-4 text-amber-600" />}
          title="Not for"
          items={fit.notFor}
        />
        <StartHereSteps
          steps={fit.startHere}
          analyticsPayload={analyticsPayload}
        />
      </CardContent>
    </Card>
  )
}
