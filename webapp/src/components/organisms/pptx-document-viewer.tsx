"use client"

import { useEffect, useRef, useState } from "react"

import {
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import type { LoadedPresentation } from "pptx-viewer"
import {
  getThumbnails,
  loadPresentation,
  renderSlideToElement,
} from "pptx-viewer"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PptxDocumentViewerProps = {
  sourceUrl: string
}

function isTypingElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function PptxDocumentViewer({ sourceUrl }: PptxDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const viewerShellRef = useRef<HTMLDivElement>(null)
  const thumbnailRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const presentationRef = useRef<LoadedPresentation | null>(null)

  const [visibleThumbnails, setVisibleThumbnails] = useState<
    Record<number, boolean>
  >({})
  const [thumbnails, setThumbnails] = useState<
    Array<{ slideIndex: number; markup: string }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [slideCount, setSlideCount] = useState(0)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [renderWidth, setRenderWidth] = useState<number>()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    let active = true

    async function initViewer() {
      try {
        setIsLoading(true)
        setError("")

        const presentation = await loadPresentation(sourceUrl)

        if (!active) {
          presentation.cleanup()
          return
        }

        presentationRef.current = presentation
        const nextSlideCount = presentation.slides.length
        const serializer = new XMLSerializer()
        const thumbElements = getThumbnails(presentation, 200)
        const nextThumbnails = thumbElements.map((thumb, index) => ({
          slideIndex: presentation.slides[index]?.index ?? index,
          markup: serializer.serializeToString(thumb),
        }))
        const initialVisible = nextThumbnails
          .slice(0, 8)
          .reduce<Record<number, boolean>>((accumulator, thumbnail) => {
            accumulator[thumbnail.slideIndex] = true
            return accumulator
          }, {})

        setSlideCount(nextSlideCount)
        setThumbnails(nextThumbnails)
        setVisibleThumbnails(initialVisible)
        setCurrentSlide(0)
      } catch {
        if (active) {
          setError("Unable to render PPTX slides.")
          setThumbnails([])
          setVisibleThumbnails({})
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void initViewer()

    return () => {
      active = false
      if (presentationRef.current) {
        presentationRef.current.cleanup()
        presentationRef.current = null
      }
    }
  }, [sourceUrl])

  useEffect(() => {
    const presentation = presentationRef.current
    const container = containerRef.current

    if (!presentation || !container || slideCount <= 0) {
      return
    }

    const width =
      renderWidth && renderWidth > 0
        ? renderWidth
        : container.clientWidth > 0
          ? container.clientWidth
          : undefined
    renderSlideToElement(presentation, currentSlide, container, {
      width,
    })
  }, [currentSlide, renderWidth, slideCount])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const host = container.parentElement

    if (!host) {
      return
    }

    const updateRenderWidth = () => {
      const nextWidth = Math.floor(container.clientWidth || host.clientWidth)
      setRenderWidth((previous) =>
        previous === nextWidth ? previous : nextWidth
      )
    }

    updateRenderWidth()

    const observer = new ResizeObserver(updateRenderWidth)
    observer.observe(host)

    return () => {
      observer.disconnect()
    }
  }, [isFullscreen, isSidebarCollapsed])

  useEffect(() => {
    if (isSidebarCollapsed || thumbnails.length === 0) {
      return
    }

    const root = sidebarRef.current

    if (!root) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleThumbnails((previous) => {
          const next = { ...previous }

          for (const entry of entries) {
            if (entry.isIntersecting) {
              const indexValue = Number(
                (entry.target as HTMLElement).dataset.slideIndex
              )
              if (!Number.isNaN(indexValue)) {
                next[indexValue] = true
              }
            }
          }

          return next
        })
      },
      {
        root,
        rootMargin: "120px 0px",
        threshold: 0.05,
      }
    )

    for (const thumbnail of thumbnails) {
      const element = thumbnailRefs.current[thumbnail.slideIndex]

      if (element) {
        observer.observe(element)
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [isSidebarCollapsed, thumbnails])

  useEffect(() => {
    if (isSidebarCollapsed) {
      return
    }

    const activeThumbnail = thumbnailRefs.current[currentSlide]
    activeThumbnail?.scrollIntoView({ block: "nearest" })
  }, [currentSlide, isSidebarCollapsed])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerShellRef.current)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  async function toggleFullscreen() {
    if (!viewerShellRef.current) {
      return
    }

    if (document.fullscreenElement === viewerShellRef.current) {
      await document.exitFullscreen()
      return
    }

    await viewerShellRef.current.requestFullscreen()
  }

  const canGoBack = currentSlide > 0
  const canGoForward = currentSlide < slideCount - 1

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isLoading || !!error || slideCount <= 0) {
        return
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return
      }

      if (isTypingElement(event.target)) {
        return
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault()
        setCurrentSlide((index) => Math.max(0, index - 1))
        return
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault()
        setCurrentSlide((index) => Math.min(slideCount - 1, index + 1))
      }
    }

    globalThis.window.addEventListener("keydown", onKeyDown)

    return () => {
      globalThis.window.removeEventListener("keydown", onKeyDown)
    }
  }, [error, isLoading, slideCount])

  return (
    <div
      ref={viewerShellRef}
      className={
        isFullscreen
          ? "h-screen w-screen space-y-3 bg-background p-3"
          : "space-y-3"
      }
    >
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed((previous) => !previous)}
            aria-label={
              isSidebarCollapsed
                ? "Expand thumbnail sidebar"
                : "Collapse thumbnail sidebar"
            }
            disabled={isLoading || thumbnails.length === 0}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSlide((index) => Math.max(0, index - 1))}
            disabled={!canGoBack || isLoading}
          >
            Previous
          </Button>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          Slide {slideCount > 0 ? currentSlide + 1 : "--"} of{" "}
          {slideCount || "--"}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentSlide((index) => Math.min(slideCount - 1, index + 1))
            }
            disabled={!canGoForward || isLoading}
          >
            Next
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading PPTX…</div>
      ) : null}

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {!isLoading && !error ? (
        <div
          className={
            isSidebarCollapsed
              ? "grid grid-cols-1"
              : "grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]"
          }
        >
          {!isSidebarCollapsed ? (
            <aside
              ref={sidebarRef}
              className={cn(
                "order-2 space-y-2 overflow-auto rounded-xl border border-border/60 bg-muted p-2 lg:order-1",
                isFullscreen
                  ? "lg:max-h-[calc(100vh-132px)]"
                  : "lg:max-h-[70vh]"
              )}
            >
              {thumbnails.map((thumbnail) => {
                const isActive = thumbnail.slideIndex === currentSlide
                const shouldRenderThumbnail =
                  visibleThumbnails[thumbnail.slideIndex] || isActive

                return (
                  <button
                    key={`slide-${thumbnail.slideIndex}`}
                    ref={(element) => {
                      thumbnailRefs.current[thumbnail.slideIndex] = element
                    }}
                    data-slide-index={thumbnail.slideIndex}
                    type="button"
                    onClick={() => {
                      setVisibleThumbnails((previous) => ({
                        ...previous,
                        [thumbnail.slideIndex]: true,
                      }))
                      setCurrentSlide(thumbnail.slideIndex)
                    }}
                    className={cn(
                      "w-full rounded-lg border p-1.5 text-left transition",
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-background hover:border-primary/40"
                    )}
                  >
                    {shouldRenderThumbnail ? (
                      <div
                        className="overflow-hidden rounded-md bg-white"
                        // react-doctor-ignore
                        dangerouslySetInnerHTML={{ __html: thumbnail.markup }}
                      />
                    ) : (
                      <div className="aspect-video rounded-md border border-border/50 bg-muted/40" />
                    )}
                    <p className="text-3xs mt-1 font-medium text-muted-foreground">
                      Slide {thumbnail.slideIndex + 1}
                    </p>
                  </button>
                )
              })}
            </aside>
          ) : null}

          <div
            className={cn(
              "order-1 overflow-auto rounded-xl border border-border/60 bg-background p-3 lg:order-2",
              isFullscreen ? "max-h-[calc(100vh-132px)]" : ""
            )}
          >
            <div ref={containerRef} className="mx-auto w-full" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
