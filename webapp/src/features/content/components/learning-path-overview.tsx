import { Clock3, FileText, Flag, Route } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import type { CollectionPhase } from "../types"

interface LearningPathOverviewProps {
  phases?: CollectionPhase[] | null
  resourceCount?: number
  tutorialCount?: number
}

export function LearningPathOverview({
  phases,
  resourceCount = 0,
  tutorialCount = 0,
}: LearningPathOverviewProps) {
  const checkpointCount = phases?.length ?? 0
  const itemCount =
    phases?.reduce((total, phase) => total + phase.items.length, 0) ?? 0
  const firstCheckpointTitle = phases?.[0]?.phaseTitle

  if (checkpointCount === 0) {
    return null
  }

  const totalIncluded = resourceCount + tutorialCount || itemCount

  return (
    <Card className="rounded-lg border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="h-4 w-4 text-primary" />
          Learning path overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Flag className="h-3.5 w-3.5" />
              Checkpoints
            </p>
            <p className="mt-1 text-2xl font-bold">{checkpointCount}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Included
            </p>
            <p className="mt-1 text-2xl font-bold">{totalIncluded}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Study time
            </p>
            <p className="mt-1 text-2xl font-bold">
              Self-paced
            </p>
          </div>
        </div>

        {firstCheckpointTitle ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Start checkpoint</span>
              <span className="text-muted-foreground">
                {firstCheckpointTitle}
              </span>
            </div>
            <Progress value={checkpointCount > 0 ? 100 : 0} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
