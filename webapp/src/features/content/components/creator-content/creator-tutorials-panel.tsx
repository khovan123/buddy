"use client"

import Link from "next/link"

import {
  BadgeCheck,
  Calendar,
  Clock,
  DollarSign,
  History,
  Loader2,
  Pencil,
  Video,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { formatCompactVND } from "@/features/billing"
import { useGetTutorialUploadHistoryByIdQuery } from "@/features/content/services/content-api"
import type {
  ContentTutorialItem,
  UploadHistoryItem,
} from "@/features/content/types"
import { useI18n } from "@/i18n/language-provider"
import { cn } from "@/lib/utils"

import { ContentItemProgressScene } from "./content-item-progress-scene"
import {
  ContentModerationChecklist,
  ContentModerationStatusBadge,
  DeleteContentButton,
  ManualModerationCheckButton,
} from "./content-moderation-status"
import { CreatorContentHeader } from "./creator-content-header"
import { CreatorEmptyPlaceholder } from "./creator-empty-placeholder"
import { UploadHistoryFileRow } from "./upload-history-file-row"

function TutorialHistoryList({ tutorialId }: { tutorialId: string }) {
  const { t } = useI18n()
  const { data, isLoading, isError } =
    useGetTutorialUploadHistoryByIdQuery(tutorialId)

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !data?.data) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t("content.uploadHistory.loadError")}
      </div>
    )
  }

  const files = data.data as UploadHistoryItem[]

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t("content.uploadHistory.emptyTutorial")}
      </div>
    )
  }

  return (
    <div className="space-y-4 px-2 pt-2 pb-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="size-4" />
        <h4>
          {t("content.uploadHistory.title")} ({files.length})
        </h4>
      </div>
      <div className="overflow-hidden rounded-md border border-border/50 bg-card">
        <div className="divide-y divide-border/50">
          {files.map((file) => (
            <UploadHistoryFileRow key={file.id} file={file} />
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) {
    return "—"
  }
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

const EMPTY_TUTORIALS: ContentTutorialItem[] = []

function canManageMutableContent(status: string) {
  return status.toUpperCase() !== "AVAILABLE"
}

export function CreatorTutorialsPanel({
  tutorials = EMPTY_TUTORIALS,
  actionHref = "/home/tutorials/create",
}: {
  tutorials?: ContentTutorialItem[]
  actionHref?: string
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <CreatorContentHeader
        title={`${t("content.tutorials")} (${tutorials.length})`}
        description={t("content.tutorialsPanel.description")}
        actionLabel={t("content.tutorialsPanel.new")}
        actionHref={actionHref}
        actionIcon={Video}
      />

      <div className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">
          {t("content.tutorialsPanel.yours")}
        </h3>

        {tutorials.length === 0 ? (
          <CreatorEmptyPlaceholder
            icon={Video}
            title={t("content.tutorialsPanel.emptyTitle")}
            description={t("content.tutorialsPanel.emptyDescription")}
          />
        ) : (
          <Accordion
            type="multiple"
            className={cn("space-y-3", tutorials.length > 0 ? "border-0" : "")}
          >
            {tutorials.map((tutorial) => (
              <AccordionItem
                key={tutorial.id}
                value={tutorial.id}
                className="bg-card text-card-foreground transition-all hover:shadow-md data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="flex items-start gap-4 text-left transition-colors hover:bg-muted/30 hover:no-underline [&>svg]:mt-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Video className="h-6 w-6" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base leading-none font-semibold tracking-tight">
                        {tutorial.title}
                      </h3>
                      <BadgeCheck
                        className={cn(
                          "h-4 w-4 shrink-0",
                          tutorial.isVerified ? "text-primary" : "text-gray-500"
                        )}
                      />
                      <ContentModerationStatusBadge
                        status={tutorial.status}
                        moderationStatus={tutorial.moderationStatus}
                      />
                      <ContentItemProgressScene
                        status={tutorial.status}
                        moderationStatus={tutorial.moderationStatus}
                        verified={tutorial.isVerified}
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 pr-8 text-sm leading-relaxed text-muted-foreground">
                      {tutorial.description}
                    </p>
                    <ContentModerationChecklist
                      status={tutorial.status}
                      moderationStatus={tutorial.moderationStatus}
                      verified={tutorial.isVerified}
                      reasons={tutorial.moderationReasons}
                      ruleVersion={tutorial.moderationRuleVersion}
                      compact
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-5 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 opacity-70" />
                        <span
                          className={
                            tutorial.price === 0
                              ? "font-semibold text-emerald-500"
                              : ""
                          }
                        >
                          {tutorial.price === 0
                            ? t("common.free")
                            : formatCompactVND(tutorial.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 opacity-70" />
                        <span>{formatDuration(tutorial.media?.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 opacity-70" />
                        <span>
                          {new Date(tutorial.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="mb-4 rounded-b-xl border-t bg-muted/10 px-5 py-4">
                  <div className="mb-4 flex flex-col gap-1">
                    <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                      <History className="h-4 w-4 text-primary" />
                      {t("content.uploadHistory.title")}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t("content.uploadHistory.tutorialDescription")}
                    </p>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {canManageMutableContent(tutorial.status) ? (
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={`/home/tutorials/create?edit=${tutorial.id}`}>
                          <Pencil className="size-4" />
                          {t("common.edit")}
                        </Link>
                      </Button>
                    ) : null}
                    <ManualModerationCheckButton
                      contentId={tutorial.id}
                      contentType="tutorial"
                      disabled={!canManageMutableContent(tutorial.status)}
                    />
                    <DeleteContentButton
                      contentId={tutorial.id}
                      contentType="tutorial"
                    />
                  </div>
                  <TutorialHistoryList tutorialId={tutorial.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  )
}
