"use client"

import { useMemo, useState } from "react"

import {
  CheckCircle2,
  Download,
  FileText,
  FileType2,
  Presentation,
  Search,
} from "lucide-react"

import { CollectionPageHeader } from "@/components/organisms/collection-page-header"
import { DocumentReader } from "@/components/organisms/document-reader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { LibraryAsset } from "@/features/library/components/library-asset-card"
import { downloadFilesSequentially } from "@/lib/download-utils"
import { cn } from "@/lib/utils"

type ResourceCollectionViewerProps = {
  badge: string
  title: string
  description: string
  files: LibraryAsset[]
}

function getFileType(sourcePath: string): "pdf" | "docx" | "pptx" | "md" {
  const normalized = sourcePath.toLowerCase()

  if (normalized.endsWith(".pdf")) {
    return "pdf"
  }
  if (normalized.endsWith(".docx")) {
    return "docx"
  }
  if (normalized.endsWith(".pptx")) {
    return "pptx"
  }
  return "md"
}

function getTypeLabel(type: "pdf" | "docx" | "pptx" | "md") {
  if (type === "pdf") {
    return "PDF Document"
  }
  if (type === "docx") {
    return "Word Document"
  }
  if (type === "pptx") {
    return "PPTX Presentation"
  }
  return "Markdown Document"
}

function getTypeIcon(type: "pdf" | "docx" | "pptx" | "md") {
  if (type === "pptx") {
    return Presentation
  }
  if (type === "docx") {
    return FileType2
  }
  return FileText
}

export function ResourceCollectionViewer({
  badge,
  title,
  description,
  files,
}: ResourceCollectionViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(files[0] ? [files[0].slug] : [])
  )

  const selectedFile = files[selectedIndex] ?? files[0]

  const selectedFileType = useMemo(() => {
    if (!selectedFile) {
      return "md" as const
    }
    return getFileType(selectedFile.sourcePath)
  }, [selectedFile])

  const progressCount = readIds.size
  const progressPercent = Math.round(
    (progressCount / Math.max(files.length, 1)) * 100
  )

  const onSelectFile = (index: number) => {
    const file = files[index]
    if (!file) {
      return
    }

    setSelectedIndex(index)
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(file.slug)
      return next
    })
  }

  const handleDownloadAll = async () => {
    if (isDownloading || files.length === 0) {
      return
    }

    setIsDownloading(true)

    try {
      await downloadFilesSequentially(files.map((file) => file.sourcePath))
    } finally {
      setIsDownloading(false)
    }
  }

  if (!selectedFile) {
    return null
  }

  return (
    <section className="min-h-screen bg-background text-foreground">
      <CollectionPageHeader
        badge={badge}
        title={title}
        progressLabel="Read progress"
        progressPercent={progressPercent}
      />

      <main className="flex min-h-[calc(100vh-4rem)] overflow-hidden">
        <section className="sidebar-scroll w-full overflow-y-auto p-4 md:w-3/4 md:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
              <FileText className="size-4 text-primary" />
              <p>
                Document preview is rendered directly from the real library
                source file.
              </p>
            </div>

            <DocumentReader
              title={selectedFile.title}
              sourceUrl={selectedFile.sourcePath}
              sourceLabel={badge}
              description={selectedFile.description || description}
              author={selectedFile.author}
              updatedAt="Apr 2026"
              pageCountHint={getTypeLabel(selectedFileType)}
              fileSize="In repo"
              format={selectedFileType.toUpperCase()}
              layout="column"
              highlights={[
                "Loaded from a real file under public/library-sources.",
                `Current file type: ${selectedFileType.toUpperCase()}.`,
                "Download uses the same source file the reader displays.",
              ]}
              notes={files
                .filter((file) => file.slug !== selectedFile.slug)
                .map((file, index) => `${index + 1}. ${file.title}`)}
            />
          </div>
        </section>

        <aside className="hidden w-1/4 space-y-6 md:block">
          <Card className="border-outline-variant/20 sticky top-24 h-[calc(100vh-140px)] overflow-hidden bg-card shadow-sm">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-outline-variant/10 space-y-4 border-b p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold tracking-tight text-foreground">
                    Resources
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground">
                    {progressCount} / {files.length} files
                  </p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    className="h-10 w-full rounded-lg border border-transparent bg-muted pl-9 text-sm outline-none focus-visible:border-ring"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                    <p className="text-3xs font-bold tracking-wider text-muted-foreground uppercase">
                      Section 1: Collection Files
                    </p>
                    <FileText className="size-4 text-muted-foreground" />
                  </div>

                  <div className="space-y-1">
                    {files.map((file, index) => {
                      const isActive = index === selectedIndex
                      const isRead = readIds.has(file.slug)
                      const type = getFileType(file.sourcePath)
                      const ItemIcon = getTypeIcon(type)

                      return (
                        <button
                          key={file.slug}
                          type="button"
                          onClick={() => onSelectFile(index)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted",
                            isActive
                              ? "border-l-4 border-primary bg-primary/5"
                              : undefined
                          )}
                        >
                          <ItemIcon
                            className={cn(
                              "mt-0.5 size-5 shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground/70"
                            )}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={cn(
                                  "truncate text-xs font-medium text-foreground/80",
                                  isActive
                                    ? "font-bold text-primary"
                                    : undefined
                                )}
                              >
                                {String(index + 1).padStart(2, "0")}.{" "}
                                {file.title}
                              </p>
                              {isRead ? (
                                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                              ) : null}
                            </div>
                            <p className="text-3xs text-muted-foreground">
                              {type.toUpperCase()} • {getTypeLabel(type)}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="border-outline-variant/10 border-t bg-background p-5">
                <Button
                  className="w-full font-semibold"
                  size="lg"
                  onClick={handleDownloadAll}
                  disabled={isDownloading}
                >
                  <Download className="size-4" />
                  {isDownloading
                    ? "Downloading Resources..."
                    : "Download All Resources"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </section>
  )
}
