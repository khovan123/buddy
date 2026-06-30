"use client"

import { useEffect, useRef, useState } from "react"

import { Maximize2, Minimize2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PdfDocumentViewerProps = {
  sourceUrl: string
  title?: string
}

export function PdfDocumentViewer({
  sourceUrl,
  title = "PDF document",
}: PdfDocumentViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
        <div
          className={cn(
            "text-sm font-medium",
            isFullscreen ? "text-foreground" : "text-muted-foreground"
          )}
        >
          PDF document
        </div>
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

      <div
        className={cn(
          "overflow-hidden border border-border/60 bg-background",
          isFullscreen
            ? "h-[calc(100vh-64px)] rounded-none border-0"
            : "min-h-[68vh] rounded-2xl"
        )}
      >
        <iframe
          src={sourceUrl}
          title={title}
          className={cn("w-full border-0", isFullscreen ? "h-full" : "h-[68vh]")}
          loading="lazy"
        />
      </div>
    </div>
  )
}
