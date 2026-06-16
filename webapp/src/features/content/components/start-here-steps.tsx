"use client"

import { ListChecks, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { StartHereStep } from "../types"
import { trackLearningFitEvent } from "../utils/learning-fit-events"

interface StartHereStepsProps {
  steps?: StartHereStep[]
  analyticsPayload?: Record<
    string,
    boolean | number | string | null | undefined
  >
}

export function StartHereSteps({
  steps,
  analyticsPayload,
}: StartHereStepsProps) {
  const ordered = [...(steps ?? [])].sort((a, b) => a.order - b.order)
  if (ordered.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ListChecks className="h-4 w-4 text-primary" />
        If you buy this, start here
      </div>
      <ol className="space-y-2">
        {ordered.map((step, index) => (
          <li key={`${step.order}-${step.title}`} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{step.title}</p>
              {step.description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.description}
                </p>
              ) : null}
              {step.aiPrompt ? (
                <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Ask Buddy AI: &quot;{step.aiPrompt}&quot;
                </p>
              ) : null}
              {analyticsPayload ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs font-semibold text-primary"
                  onClick={() =>
                    trackLearningFitEvent("start_here_clicked", {
                      ...analyticsPayload,
                      stepOrder: step.order,
                      stepTitle: step.title,
                      targetType: step.targetType,
                    })
                  }
                >
                  Use this step
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
