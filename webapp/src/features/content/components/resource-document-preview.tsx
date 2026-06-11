"use client"

import { useState } from "react"

import Image from "next/image"

import { FileText, ShieldCheck } from "lucide-react"

import { DocumentReader } from "@/components/organisms/document-reader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"
import type { ResourcePreviewResponse } from "@/features/content/services/content.service"

interface ResourceDocumentPreviewProps {
  resourceId: string
  thumbnailUrl?: string | null
  title: string
  sourceLabel: string
  description: string
  author: string
  updatedAt: string
  pageCountHint: string
  fileSize: string
  highlights: string[]
  previewData?: ResourcePreviewResponse | null
}

export function ResourceDocumentPreview({
  thumbnailUrl,
  title,
  sourceLabel,
  description,
  author,
  updatedAt,
  pageCountHint,
  fileSize,
  highlights,
  previewData,
}: ResourceDocumentPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const previewStatus = previewData?.status
  const canViewPreview = Boolean(previewData?.previewUrl)
  const unavailableLabel =
    previewStatus === "FAILED"
      ? "Preview failed"
      : previewStatus === "UNSUPPORTED"
        ? "Preview unavailable"
        : "Processing Preview..."
  const previewMessage =
    previewStatus === "FAILED"
      ? "Preview generation failed. Purchase to access the full document."
      : previewStatus === "UNSUPPORTED"
        ? "Preview is unavailable for this file format."
        : previewData?.isPreview
          ? `Preview limited to ${previewData.previewPercentage}%. Buy to unlock full document.`
          : "Free resource. View full document."

  if (isPlaying && previewData?.previewUrl) {
    return (
      <DocumentReader
        title={title}
        sourceUrl={previewData.previewUrl}
        sourceLabel={sourceLabel}
        description={description}
        author={author}
        updatedAt={updatedAt}
        pageCountHint={pageCountHint}
        fileSize={fileSize}
        format={previewData.format || "pdf"}
        highlights={highlights}
        notes={[]}
        layout="column"
        isPreview={previewData.isPreview}
        previewPercentage={previewData.previewPercentage}
        hideHeader={true}
        hideDetails={true}
        onUnlock={() => {
          const buyButton = document.getElementById("buy-resource-button")
          buyButton?.scrollIntoView({ behavior: "smooth" })
        }}
      />
    )
  }

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/30 bg-card p-0 shadow-sm">
      <div className="relative aspect-video w-full bg-muted">
        {thumbnailUrl ? (
          <Image
            fill
            src={thumbnailUrl}
            alt="Document cover"
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="size-16 text-muted-foreground/50" />
          </div>
        )}
      </div>

      <div className="absolute right-0 bottom-0 left-0 flex items-center justify-between border-t border-white/20 bg-white/80 px-8 py-6 backdrop-blur-md">
        <Item
          variant="default"
          size="sm"
          className="w-auto border-0 bg-transparent p-0 text-sm font-medium text-foreground"
        >
          <ItemMedia variant="icon">
            <ShieldCheck className="size-5 text-primary" />
          </ItemMedia>
          <ItemTitle className="text-sm font-medium">
            {previewMessage}
          </ItemTitle>
        </Item>
        <Button
          variant="default"
          size="sm"
          className="font-bold shadow-sm"
          onClick={() => setIsPlaying(true)}
          disabled={!canViewPreview}
        >
          {canViewPreview ? "View Document" : unavailableLabel}
        </Button>
      </div>
    </Card>
  )
}
