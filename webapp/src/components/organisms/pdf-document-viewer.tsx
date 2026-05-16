"use client"

import { useEffect, useRef, useState } from "react"

import { Maximize2, Minimize2 } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

type PdfDocumentViewerProps = {
  sourceUrl: string
}

export function PdfDocumentViewer({ sourceUrl }: PdfDocumentViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [currentPdfPage, setCurrentPdfPage] = useState(1)
  const [pdfViewerWidth, setPdfViewerWidth] = useState(0)
  const [pdfZoom, setPdfZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const element = pdfContainerRef.current

    if (!element) {
      return
    }

    const updateWidth = () => {
      setPdfViewerWidth(element.clientWidth)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current)
    }

    document.addEventListener("fullscreenchange", syncFullscreenState)

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState)
    }
  }, [])

  const toggleFullscreen = async () => {
    const element = viewerRef.current

    if (!element) {
      return
    }

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen()
        return
      }

      await element.requestFullscreen()
    } catch {
      // Ignore fullscreen API errors (unsupported browser / user action restrictions)
    }
  }

  const canGoBack = currentPdfPage > 1
  const canGoForward = currentPdfPage < pdfPageCount
  const pdfWidth = pdfViewerWidth > 0 ? Math.round(pdfViewerWidth * pdfZoom) : 0
  const controlButtonVariant: "ghost" | "outline" = isFullscreen
    ? "outline"
    : "ghost"

  return (
    <div
      ref={viewerRef}
      className={cn(
        "space-y-3",
        isFullscreen ? "fixed inset-0 z-50 overflow-auto bg-background" : ""
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted px-3 py-2",
          isFullscreen
            ? "sticky top-0 z-20 border-border bg-background/95 shadow-md backdrop-blur-md supports-backdrop-filter:bg-background/80"
            : ""
        )}
      >
        <Button
          variant={controlButtonVariant}
          size="sm"
          onClick={() => setCurrentPdfPage((page) => Math.max(1, page - 1))}
          disabled={!canGoBack}
        >
          Previous
        </Button>
        <div
          className={cn(
            "text-sm font-medium",
            isFullscreen ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Page {currentPdfPage} of {pdfPageCount || "--"}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={controlButtonVariant}
            size="sm"
            onClick={() =>
              setPdfZoom((zoom) =>
                Math.max(0.75, Number((zoom - 0.1).toFixed(2)))
              )
            }
          >
            -
          </Button>
          <span
            className={cn(
              "min-w-12 text-center text-xs font-semibold",
              isFullscreen ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {Math.round(pdfZoom * 100)}%
          </span>
          <Button
            variant={controlButtonVariant}
            size="sm"
            onClick={() =>
              setPdfZoom((zoom) =>
                Math.min(1.75, Number((zoom + 0.1).toFixed(2)))
              )
            }
          >
            +
          </Button>
        </div>
        <Button
          variant={controlButtonVariant}
          size="sm"
          onClick={() =>
            setCurrentPdfPage((page) =>
              Math.min(pdfPageCount || page, page + 1)
            )
          }
          disabled={!canGoForward}
        >
          Next
        </Button>
        <Button
          variant={controlButtonVariant}
          size="icon"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </Button>
      </div>

      <div ref={pdfContainerRef} className="overflow-x-hidden">
        <Document
          file={sourceUrl}
          loading={
            <div className="text-sm text-muted-foreground">Loading PDF…</div>
          }
          error={
            <div className="text-sm text-destructive">
              Unable to load the PDF preview.
            </div>
          }
          onLoadSuccess={({ numPages }) => {
            setPdfPageCount(numPages)
            setCurrentPdfPage((page) => Math.min(page, numPages))
          }}
        >
          {pdfWidth > 0 ? (
            <Page
              key={`${currentPdfPage}-${pdfZoom}`}
              pageNumber={currentPdfPage}
              width={pdfWidth}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          ) : null}
        </Document>
      </div>
    </div>
  )
}
