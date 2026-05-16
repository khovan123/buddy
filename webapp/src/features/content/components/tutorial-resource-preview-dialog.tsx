"use client"

import { ReactNode } from "react"

import { DocumentReader } from "@/components/organisms/document-reader"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ResourcePreviewResponse } from "@/features/content/services/content.service"

interface TutorialResourcePreviewDialogProps {
  children: ReactNode
  previewData?: ResourcePreviewResponse | null
  title: string
  description?: string
  author?: string
}

export function TutorialResourcePreviewDialog({
  children,
  previewData,
  title,
  description,
  author,
}: TutorialResourcePreviewDialogProps) {
  if (!previewData || !previewData.previewUrl) {
    return <>{children}</>
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="h-[85vh] w-[90vw] max-w-5xl overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">{title} Preview</DialogTitle>
        <div className="h-full w-full overflow-hidden rounded-2xl border border-border/30 bg-card">
          <DocumentReader
            title={title}
            sourceUrl={previewData.previewUrl}
            sourceLabel="Resource Preview"
            description={description || ""}
            author={author || "Expert Buddy"}
            updatedAt={new Date().toISOString()}
            pageCountHint="-"
            fileSize="-"
            format={previewData.format || "pdf"}
            highlights={[]}
            notes={[]}
            layout="column"
            isPreview={previewData.isPreview}
            previewPercentage={previewData.previewPercentage}
            hideHeader={true}
            hideDetails={true}
            onUnlock={() => {
              const buyButton = document.getElementById("buy-tutorial-button")
              buyButton?.scrollIntoView({ behavior: "smooth" })
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
