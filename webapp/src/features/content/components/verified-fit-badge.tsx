"use client"

import { ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { LearningFit } from "../types"
import { isVerifiedFit } from "../utils/learning-fit"

interface VerifiedFitBadgeProps {
  fit?: LearningFit | null
}

export function VerifiedFitBadge({ fit }: VerifiedFitBadgeProps) {
  if (!isVerifiedFit(fit)) {
    return null
  }

  const evidenceCount = fit?.fitEvidence?.length ?? 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Fit
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {evidenceCount > 0
            ? `Verified Fit uses ${evidenceCount} evidence source${evidenceCount === 1 ? "" : "s"} to explain who this content is best for and how to start learning.`
            : "Verified Fit means Buddy has enough structured guidance to explain who this content is best for and how to start learning."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
