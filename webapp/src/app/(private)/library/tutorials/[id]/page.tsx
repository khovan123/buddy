import type { Metadata } from "next"

import { notFound } from "next/navigation"

import { Download, FileText, Info } from "lucide-react"

import { LibraryBackButton } from "@/components/atoms/library-back-button"
import { MetaChip } from "@/components/atoms/meta-chip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getLibraryTutorialBySlug } from "@/features/content"
import { getSeoContent } from "@/features/seo/services/seo-content"

type PageParams = Promise<{ id: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent("library-tutorials-:id"),
  ])
  const canonical = `/library/tutorials/${id}`

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: "video.other",
    },
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hrs}h ${remainMins}m`
  }
  return `${mins}m ${secs}s`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function LibraryTutorialDetailPage({
  params,
}: {
  params: PageParams
}) {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent("library-tutorials-:id"),
  ])
  const tutorial = await getLibraryTutorialBySlug(id)

  if (!tutorial) {
    notFound()
  }

  const videoUrl = tutorial.media?.videoUrl || tutorial.media?.streamingUrl
  const duration = tutorial.media?.duration
    ? formatDuration(tutorial.media.duration)
    : "—"
  const fileSize = tutorial.media?.fileSize
    ? formatFileSize(tutorial.media.fileSize)
    : "—"
  const linkedResourceCount = tutorial.resourceIds?.length ?? 0

  return (
    <section className="bg-background text-foreground">
      <main className="min-h-screen">
        <section className="py-8">
          <div className="mx-auto w-full max-w-400 px-6">
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex flex-col gap-2">
                <LibraryBackButton
                  fallbackHref="/library"
                  label="Back to Library"
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                />
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {tutorial.title}
                </h1>
              </div>

              {videoUrl ? (
                <Button
                  className="w-fit gap-2 bg-linear-to-r from-primary to-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105"
                  asChild
                >
                  <a href={videoUrl} download>
                    <Download className="size-4" />
                    Download Video
                  </a>
                </Button>
              ) : null}
            </div>

            {/* Theater Mode Layout */}
            <div className="flex flex-col gap-8 xl:flex-row">
              {/* Main Column: Video Player */}
              <div className="min-w-0 flex-1 space-y-8">
                {videoUrl ? (
                  <div className="group relative aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                    <div className="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <video
                      src={videoUrl}
                      controls
                      preload="metadata"
                      playsInline
                      className="h-full w-full object-cover"
                    >
                      Your browser does not support HTML5 video playback.
                    </video>
                  </div>
                ) : (
                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-3xl bg-card/50 shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
                    <div className="text-center">
                      <div className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                        <Info className="relative z-10 size-8 text-primary" />
                      </div>
                      <p className="mt-3 text-lg font-medium text-foreground/80">
                        Video is still processing
                      </p>
                      <p className="text-sm text-muted-foreground">
                        It will be available shortly.
                      </p>
                    </div>
                  </div>
                )}

                {/* Video Details & Highlights */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <Card className="rounded-3xl border border-white/5 bg-card/40 shadow-sm backdrop-blur-xl transition-colors hover:border-primary/20">
                      <CardContent className="space-y-4 p-8">
                        <p className="text-xs font-bold tracking-widest text-primary uppercase">
                          About this Tutorial
                        </p>
                        <p className="text-base leading-relaxed text-foreground/80">
                          {tutorial.description || "No description provided."}
                        </p>
                      </CardContent>
                    </Card>

                    {tutorial.hightlights && tutorial.hightlights.length > 0 ? (
                      <Card className="rounded-3xl border border-white/5 bg-card/40 shadow-sm backdrop-blur-xl transition-colors hover:border-primary/20">
                        <CardContent className="space-y-4 p-8">
                          <p className="text-xs font-bold tracking-widest text-primary uppercase">
                            Key Highlights
                          </p>
                          <ul className="grid gap-3 sm:grid-cols-2">
                            {tutorial.hightlights.map((h) => (
                              <li
                                key={h}
                                className="flex items-start gap-3 text-sm font-medium text-foreground/80"
                              >
                                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_10px_theme('colors.primary.DEFAULT')]" />
                                {h}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>

                  {/* Tutorial Details Sidebar */}
                  <aside className="lg:col-span-1">
                    <Card className="rounded-3xl border border-white/5 bg-card/40 p-8 shadow-sm backdrop-blur-xl transition-colors hover:border-primary/20">
                      <p className="mb-6 text-xs font-bold tracking-widest text-primary uppercase">
                        Details
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Duration
                          </span>
                          <span className="font-semibold">{duration}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Video Size
                          </span>
                          <span className="font-semibold">{fileSize}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <Badge
                            variant="secondary"
                            className="border-none bg-primary/10 text-primary shadow-sm"
                          >
                            {tutorial.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Updated</span>
                          <span className="font-semibold">
                            {new Date(tutorial.updatedAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </aside>
                </div>
              </div>

              {/* Contextual Resources Bar */}
              <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-96">
                <div className="group relative flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/5 bg-card/30 p-6 shadow-xl backdrop-blur-2xl transition-all duration-500 hover:border-accent/40 md:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-accent/5 to-transparent" />

                  <div className="relative z-10 space-y-6">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                        <FileText className="size-5 text-accent" />
                        Attached Resources
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Download materials included in this tutorial package.
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-card/20 p-8 text-center">
                      <Info className="mb-3 size-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {linkedResourceCount > 0
                          ? `${linkedResourceCount} linked resource${linkedResourceCount === 1 ? "" : "s"}`
                          : "No resources attached"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        {linkedResourceCount > 0
                          ? "Linked resources will appear here when the library API returns their details."
                          : "This tutorial does not have any downloadable materials."}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <div className="sr-only">
        <MetaChip>{seo.badge}</MetaChip>
      </div>
    </section>
  )
}
