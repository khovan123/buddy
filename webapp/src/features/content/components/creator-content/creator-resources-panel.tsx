"use client"

import Link from "next/link"

import {
  BadgeCheck,
  Calendar,
  DollarSign,
  FileText,
  History,
  Loader2,
  Pencil,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { useGetResourceUploadHistoryByIdQuery } from "@/features/content/services/content-api"
import type {
  ContentResourceItem,
  UploadHistoryItem,
} from "@/features/content/types"
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

function ResourceHistoryList({ resourceId }: { resourceId: string }) {
  const { data, isLoading, isError } =
    useGetResourceUploadHistoryByIdQuery(resourceId)

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
        Failed to load upload history.
      </div>
    )
  }

  const files = data.data as UploadHistoryItem[]

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No upload history for this resource.
      </div>
    )
  }

  return (
    <div className="space-y-4 px-2 pt-2 pb-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="size-4" />
        <h4>Upload History ({files.length})</h4>
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

const EMPTY_RESOURCES: ContentResourceItem[] = []

function canEditContent(status: string, moderationStatus?: string | null) {
  const normalizedStatus = status.toUpperCase()
  const normalizedModeration = moderationStatus?.toUpperCase() ?? ""
  return (
    normalizedStatus === "PROCESSING" ||
    normalizedModeration === "PENDING" ||
    normalizedStatus === "BANNED" ||
    normalizedModeration === "REJECTED"
  )
}

export function CreatorResourcesPanel({
  resources = EMPTY_RESOURCES,
  actionHref = "/home/resources/create",
}: {
  resources?: ContentResourceItem[]
  actionHref?: string
}) {
  return (
    <div className="space-y-6">
      <CreatorContentHeader
        title={`Resources (${resources.length})`}
        description="Manage your document resources and track upload progress."
        actionLabel="New Resource"
        actionHref={actionHref}
        actionIcon={FileText}
      />

      <div className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">Your Resources</h3>

        {resources.length === 0 ? (
          <CreatorEmptyPlaceholder
            icon={FileText}
            title="No resources yet"
            description="Create your first resource to share documents and files with students."
          />
        ) : (
          <Accordion
            type="multiple"
            className={cn("space-y-3", resources.length > 0 ? "border-0" : "")}
          >
            {resources.map((resource) => (
              <AccordionItem
                key={resource.id}
                value={resource.id}
                className="bg-card text-card-foreground transition-all hover:shadow-md data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="flex items-start gap-4 text-left transition-colors hover:bg-muted/30 hover:no-underline [&>svg]:mt-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base leading-none font-semibold tracking-tight">
                        {resource.title}
                      </h3>
                      <BadgeCheck
                        className={cn(
                          "h-4 w-4 shrink-0",
                          resource.resourceVerified
                            ? "text-primary"
                            : "text-gray-500"
                        )}
                      />
                      <ContentModerationStatusBadge
                        status={resource.status}
                        moderationStatus={resource.moderationStatus}
                      />
                      <ContentItemProgressScene
                        status={resource.status}
                        moderationStatus={resource.moderationStatus}
                        verified={resource.resourceVerified}
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 pr-8 text-sm leading-relaxed text-muted-foreground">
                      {resource.summary}
                    </p>
                    <ContentModerationChecklist
                      status={resource.status}
                      moderationStatus={resource.moderationStatus}
                      verified={resource.resourceVerified}
                      reasons={resource.moderationReasons}
                      ruleVersion={resource.moderationRuleVersion}
                      compact
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-5 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 opacity-70" />
                        <span
                          className={
                            resource.price === 0
                              ? "font-semibold text-emerald-500"
                              : ""
                          }
                        >
                          {resource.price === 0
                            ? "Free"
                            : new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(resource.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 opacity-70" />
                        <span>
                          {new Date(resource.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="mb-4 rounded-b-xl border-t bg-muted/10 px-5 py-4">
                  <div className="mb-4 flex flex-col gap-1">
                    <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                      <History className="h-4 w-4 text-primary" />
                      Upload History
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      View all upload attempts and their execution status for
                      this resource.
                    </p>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {canEditContent(
                      resource.status,
                      resource.moderationStatus
                    ) ? (
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={`/home/resources/create?edit=${resource.id}`}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                    ) : null}
                    <ManualModerationCheckButton
                      contentId={resource.id}
                      contentType="resource"
                    />
                    <DeleteContentButton
                      contentId={resource.id}
                      contentType="resource"
                    />
                  </div>
                  <ResourceHistoryList resourceId={resource.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  )
}
