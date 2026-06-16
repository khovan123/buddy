import { Clock3, FileText, Flag, Route } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import type { CollectionPhase, LearningFit } from "../types"
import { getLearningPathStats } from "../utils/learning-fit-copy"

interface LearningPathOverviewProps {
  phases?: CollectionPhase[] | null
  fit?: LearningFit | null
  resourceCount?: number
  tutorialCount?: number
}

export function LearningPathOverview({
  phases,
  fit,
  resourceCount = 0,
  tutorialCount = 0,
}: LearningPathOverviewProps) {
  const stats = getLearningPathStats(phases)

  if (!stats.hasPath && !fit) {
    return null
  }

  const totalIncluded = resourceCount + tutorialCount || stats.itemCount

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
            <p className="mt-1 text-2xl font-bold">{stats.checkpointCount}</p>
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
              {fit?.estimatedStudyTimeMinutes
                ? `${fit.estimatedStudyTimeMinutes}m`
                : "Self-paced"}
            </p>
          </div>
        </div>

        {stats.firstCheckpointTitle ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Start checkpoint</span>
              <span className="text-muted-foreground">
                {stats.firstCheckpointTitle}
              </span>
            </div>
            <Progress value={stats.checkpointCount > 0 ? 100 : 0} />
          </div>
        ) : null}

        {fit?.learningOutcomes?.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">What you will be able to do</p>
            <ul className="grid gap-1.5 text-sm text-muted-foreground">
              {fit.learningOutcomes.slice(0, 4).map((outcome) => (
                <li key={outcome} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
