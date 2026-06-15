"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import dynamic from "next/dynamic"

import { Download, Lock } from "lucide-react"

import { DocxDocumentViewer } from "@/components/organisms/docx-document-viewer"
import { MarkdownDocumentViewer } from "@/components/organisms/markdown-document-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"
import { cn } from "@/lib/utils"

const PdfDocumentViewer = dynamic(
  () =>
    import("@/components/organisms/pdf-document-viewer").then(
      (module) => module.PdfDocumentViewer
    ),
  {
    ssr: false,
  }
)
const PptxDocumentViewer = dynamic(
  () =>
    import("@/components/organisms/pptx-document-viewer").then(
      (module) => module.PptxDocumentViewer
    ),
  {
    ssr: false,
  }
)

type DocumentReaderProps = {
  title: string
  sourceUrl: string
  sourceLabel: string
  description: string
  author: string
  updatedAt: string
  pageCountHint: string
  fileSize: string
  format: string
  highlights: string[]
  notes: string[]
  layout?: "default" | "column"
  isPreview?: boolean
  previewPercentage?: number
  onUnlock?: () => void
  hideHeader?: boolean
  hideDetails?: boolean
}

type SourceKind = "pdf" | "docx" | "pptx" | "md" | "unknown"

function sanitizeSource(content: string) {
  return content.replace(/\r\n/g, "\n")
}

function getSourceKind(
  sourceUrl: string,
  format?: string,
  isPreview?: boolean
): SourceKind {
  const normalizedFormat = format?.toLowerCase()

  if (
    isPreview &&
    normalizedFormat &&
    ["doc", "docx", "ppt", "pptx"].includes(normalizedFormat)
  ) {
    return "md"
  }

  const cleanUrl = sourceUrl.split("?")[0].toLowerCase()

  if (cleanUrl.endsWith(".pdf")) {
    return "pdf"
  }

  if (cleanUrl.endsWith(".docx")) {
    return "docx"
  }

  if (cleanUrl.endsWith(".pptx")) {
    return "pptx"
  }

  if (cleanUrl.endsWith(".md") || cleanUrl.endsWith(".markdown")) {
    return "md"
  }

  return "unknown"
}

async function fetchFile(url: string) {
  return fetch(url)
}

export function DocumentReader({
  title,
  sourceUrl,
  sourceLabel,
  description,
  author,
  updatedAt,
  pageCountHint,
  fileSize,
  format,
  highlights,
  notes,
  layout = "default",
  isPreview = false,
  previewPercentage = 100,
  onUnlock,
  hideHeader = false,
  hideDetails = false,
}: DocumentReaderProps) {
  const kind = useMemo(
    () => getSourceKind(sourceUrl, format, isPreview),
    [format, isPreview, sourceUrl]
  )
  const viewerRef = useRef<HTMLDivElement>(null)
  const [documentText, setDocumentText] = useState("")
  const [documentHtml, setDocumentHtml] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [fontScale, setFontScale] = useState(1)

  useEffect(() => {
    let active = true

    async function loadDocument() {
      try {
        setIsLoading(true)
        setDocumentText("")
        setDocumentHtml("")

        if (kind === "pdf" || kind === "pptx") {
          if (active) {
            setIsLoading(false)
          }
          return
        }

        const response = await fetchFile(sourceUrl)

        if (!response.ok) {
          throw new Error(`Failed to load ${sourceUrl}`)
        }

        if (kind === "md" || kind === "unknown") {
          const content = sanitizeSource(await response.text())
          if (active) {
            setDocumentText(content)
          }
          return
        }

        const arrayBuffer = await response.arrayBuffer()

        if (kind === "docx") {
          // eslint-disable-next-line @typescript-eslint/no-require-imports, import/extensions
          const mammothModule = require("mammoth/mammoth.browser.js")
          const converted = await mammothModule.convertToHtml({ arrayBuffer })
          if (active) {
            setDocumentHtml(converted.value)
          }
          return
        }
      } catch {
        if (active) {
          setDocumentText(
            "# Unable to load document\n\nThe source file could not be loaded."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadDocument()

    return () => {
      active = false
    }
  }, [kind, sourceUrl])

  const displayText = useMemo(() => documentText || "", [documentText])
  const isColumnLayout = layout === "column"
  const readerMinHeightClassName = hideHeader
    ? "min-h-[70vh] lg:min-h-[760px]"
    : "min-h-[65vh]"

  return (
    <section className={!hideHeader ? "space-y-6 pb-12" : ""}>
      {!hideHeader && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-border/60 text-xs font-semibold tracking-[0.16em] uppercase"
              >
                {sourceLabel}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs font-semibold tracking-[0.16em] uppercase"
              >
                {format}
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isPreview && (
              <Button variant="outline" size="sm" asChild>
                <a href={sourceUrl} download>
                  <Download className="size-4" />
                  Download source
                </a>
              </Button>
            )}
            {isPreview && (
              <Button
                variant="default"
                size="sm"
                onClick={onUnlock}
                className="gap-1.5"
              >
                <Lock className="size-3.5" />
                Unlock full document
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        className={
          isColumnLayout
            ? "space-y-6"
            : "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
        }
      >
        <div className="relative space-y-0">
          <Card
            className={cn(
              "overflow-hidden border-border/60 bg-card shadow-sm",
              isPreview ? "rounded-b-none border-b-0" : ""
            )}
          >
            <CardContent className="bg-card">
              <div
                ref={viewerRef}
                className={`${readerMinHeightClassName} overflow-auto rounded-2xl`}
              >
                {isLoading ? (
                  <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
                    Loading document…
                  </div>
                ) : kind === "pdf" ? (
                  <PdfDocumentViewer sourceUrl={sourceUrl} />
                ) : kind === "docx" ? (
                  <DocxDocumentViewer
                    htmlContent={documentHtml}
                    fontScale={fontScale}
                    sourceLabel={sourceLabel}
                    pageCountHint={pageCountHint}
                    onDecreaseFont={() =>
                      setFontScale((value) =>
                        Math.max(0.85, Number((value - 0.05).toFixed(2)))
                      )
                    }
                    onIncreaseFont={() =>
                      setFontScale((value) =>
                        Math.min(1.4, Number((value + 0.05).toFixed(2)))
                      )
                    }
                  />
                ) : kind === "pptx" ? (
                  <PptxDocumentViewer sourceUrl={sourceUrl} />
                ) : (
                  <MarkdownDocumentViewer
                    content={displayText}
                    fontScale={fontScale}
                    sourceLabel={sourceLabel}
                    pageCountHint={pageCountHint}
                    onDecreaseFont={() =>
                      setFontScale((value) =>
                        Math.max(0.85, Number((value - 0.05).toFixed(2)))
                      )
                    }
                    onIncreaseFont={() =>
                      setFontScale((value) =>
                        Math.min(1.4, Number((value + 0.05).toFixed(2)))
                      )
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Preview Paywall Gate ─────────────────────────── */}
          {isPreview && (
            <div className="rounded-2xl rounded-t-none border border-primary/20 bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                  <Lock className="size-3.5" />
                  End of {previewPercentage}% preview
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    Continue reading with full access
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Purchase to unlock the complete document and download
                    access.
                  </p>
                </div>
                <Button onClick={onUnlock} size="sm" className="gap-1.5">
                  <Lock className="size-3.5" />
                  Unlock Full Document
                </Button>
              </div>
            </div>
          )}
        </div>

        {!hideDetails && (
          <aside
            className={
              isColumnLayout ? "space-y-4" : "sticky top-8 space-y-4 self-start"
            }
          >
            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Document details
                  </p>
                  <p className="text-lg font-bold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{author}</p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Format</span>
                    <span className="font-semibold text-foreground">
                      {format}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">File source</span>
                    <span className="font-semibold text-foreground">
                      {fileSize}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="font-semibold text-foreground">
                      {updatedAt}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-4 p-6">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Key points
                </p>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {highlights.map((highlight) => (
                    <Item
                      key={highlight}
                      variant="default"
                      size="xs"
                      className="w-full border-0 p-0 text-left"
                    >
                      <ItemMedia variant="icon">
                        <span className="size-2 rounded-full bg-primary" />
                      </ItemMedia>
                      <ItemTitle className="text-sm font-medium text-foreground">
                        {highlight}
                      </ItemTitle>
                    </Item>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-3 p-6">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Reading notes
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </section>
  )
}
