"use client"

import { useMemo, useState } from "react"

import { Download, FileText, Presentation } from "lucide-react"

import { DocumentReader } from "@/components/organisms/document-reader"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { TutorialAttachedResource } from "@/features/library/types"
import { cn } from "@/lib/utils"

type TutorialAttachedResourcesProps = {
  resources: TutorialAttachedResource[]
  tutorialTitle: string
  tutorialAuthor: string
}

function getResourceIconClasses(kind: TutorialAttachedResource["kind"]) {
  if (kind === "pdf") {
    return "bg-destructive/10 text-destructive"
  }

  if (kind === "pptx") {
    return "bg-primary/10 text-primary"
  }

  return "bg-secondary text-secondary-foreground"
}

function getFormat(kind: TutorialAttachedResource["kind"]) {
  if (kind === "pdf") {
    return { format: "PDF", pageCountHint: "PDF document" }
  }

  if (kind === "pptx") {
    return { format: "PPTX", pageCountHint: "Presentation" }
  }

  return { format: "DOCX", pageCountHint: "Word document" }
}

export function TutorialAttachedResources({
  resources,
  tutorialTitle,
  tutorialAuthor,
}: TutorialAttachedResourcesProps) {
  const [selectedResource, setSelectedResource] =
    useState<TutorialAttachedResource | null>(null)

  const selectedResourceFormat = useMemo(() => {
    if (!selectedResource) {
      return null
    }

    return getFormat(selectedResource.kind)
  }, [selectedResource])

  return (
    <>
      <div className="space-y-4">
        {resources.map((resource) => (
          <div
            key={resource.title}
            className="group flex items-center justify-between rounded-2xl bg-card p-5 transition-all hover:shadow-xl hover:shadow-foreground/5"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl",
                  getResourceIconClasses(resource.kind)
                )}
              >
                {resource.kind === "pptx" ? (
                  <Presentation className="size-6" />
                ) : (
                  <FileText className="size-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground">{resource.title}</h3>
                <p className="text-sm font-medium text-foreground/60">
                  {resource.meta}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="px-4 py-2 text-sm font-semibold text-primary hover:bg-muted"
                onClick={() => setSelectedResource(resource)}
              >
                View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 bg-muted px-4 py-2 text-sm font-semibold transition-all hover:bg-primary hover:text-white active:scale-95"
                asChild
              >
                <a href={resource.downloadUrl} download>
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(selectedResource)}
        onOpenChange={(open) => !open && setSelectedResource(null)}
      >
        <DialogContent className="h-[90vh] max-w-[calc(100%-2rem)] sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{selectedResource?.title}</DialogTitle>
          </DialogHeader>

          {selectedResource && selectedResourceFormat ? (
            <div className="h-full overflow-y-auto">
              <DocumentReader
                title={selectedResource.title}
                sourceUrl={selectedResource.href}
                sourceLabel={tutorialTitle}
                description={`Attached resource from ${tutorialTitle}.`}
                author={tutorialAuthor}
                updatedAt="Apr 2026"
                pageCountHint={selectedResourceFormat.pageCountHint}
                fileSize={
                  selectedResource.meta.split("•")[0]?.trim() ?? "In repo"
                }
                format={selectedResourceFormat.format}
                highlights={[
                  "Rendered with format-aware viewer.",
                  "Use toolbar controls to adjust reading experience.",
                ]}
                notes={["Use Download button to save local file."]}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
