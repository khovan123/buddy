"use client"

import { useState } from "react"

import Image from "next/image"

import {
  CheckCircle2,
  Clock3,
  Download,
  PlayCircle,
  Search,
  Star,
  Users,
} from "lucide-react"

import { CollectionPageHeader } from "@/components/organisms/collection-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"
import type {
  LibraryTutorialCollection,
  TutorialDiscussionItem,
  TutorialInstructor,
  TutorialResourceItem,
} from "@/features/library/types"
import { downloadFilesSequentially } from "@/lib/download-utils"
import { cn } from "@/lib/utils"

export type TutorialCollectionLessonView = {
  id: string
  title: string
  duration: string
  tutorialTitle: string
  tutorialAuthor: string
  poster: string
  videoSource: string
  description: string[]
  resources: TutorialResourceItem[]
  discussion: TutorialDiscussionItem[]
  instructor: TutorialInstructor | null
}

type TutorialCollectionPlayerProps = {
  badge: string
  collection: LibraryTutorialCollection
  initialCompletedTutorials: number
  tutorialViews: TutorialCollectionLessonView[]
}

export function TutorialCollectionPlayer({
  badge,
  collection,
  initialCompletedTutorials,
  tutorialViews,
}: TutorialCollectionPlayerProps) {
  const safeInitialIndex = Math.min(
    Math.max(initialCompletedTutorials - 1, 0),
    Math.max(tutorialViews.length - 1, 0)
  )
  const [selectedTutorialIndex, setSelectedTutorialIndex] =
    useState(safeInitialIndex)
  const [activeTab, setActiveTab] = useState<
    "description" | "resources" | "discussion"
  >("description")
  const [isDownloading, setIsDownloading] = useState(false)

  const selectedTutorial =
    tutorialViews[selectedTutorialIndex] ?? tutorialViews[0] ?? null

  const completedTutorials = Math.min(
    Math.max(initialCompletedTutorials, 0),
    collection.tutorials.length
  )
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (completedTutorials / Math.max(collection.tutorials.length, 1)) * 100
      )
    )
  )

  const handleDownloadAllResources = async () => {
    if (
      isDownloading ||
      !selectedTutorial ||
      selectedTutorial.resources.length === 0
    ) {
      return
    }

    setIsDownloading(true)

    try {
      await downloadFilesSequentially(
        selectedTutorial.resources.map((resource) => resource.sourcePath)
      )
    } finally {
      setIsDownloading(false)
    }
  }

  if (!selectedTutorial) {
    return null
  }

  const isPlayableVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(
    selectedTutorial.videoSource
  )

  return (
    <section className="space-y-6 pb-10">
      <CollectionPageHeader
        sticky
        badge={badge}
        title={collection.title}
        progressLabel="Progress"
        progressPercent={progressPercent}
        rightSlot={
          <Button variant="secondary" size="sm" className="font-semibold">
            <Star className="size-4 text-amber-500" />
            Leave a Rating
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-10">
        <div className="space-y-8 lg:col-span-7">
          <div className="group relative aspect-video overflow-hidden rounded-xl bg-black shadow-2xl">
            {isPlayableVideo ? (
              <video
                key={selectedTutorial.id}
                src={selectedTutorial.videoSource}
                controls
                preload="metadata"
                playsInline
                poster={selectedTutorial.poster}
                className="h-full w-full object-cover transition-opacity duration-300"
              >
                Your browser does not support HTML5 video playback.
              </video>
            ) : (
              <Image
                fill
                src={selectedTutorial.poster}
                alt={selectedTutorial.tutorialTitle}
                sizes="(max-width: 1024px) 100vw, 70vw"
                className="object-cover opacity-80"
              />
            )}
          </div>

          <Card className="overflow-hidden rounded-3xl border-border/40 bg-card/40 shadow-sm backdrop-blur-md">
            <CardContent className="space-y-8 p-6 md:p-8">
              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-5 md:col-span-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                    {collection.title}
                  </h1>
                  <p className="leading-relaxed text-muted-foreground">
                    {collection.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-primary/10 bg-muted px-3 py-1 text-xs font-semibold text-primary">
                      UI Motion
                    </span>
                    <span className="rounded-full border border-primary/10 bg-muted px-3 py-1 text-xs font-semibold text-primary">
                      Interaction
                    </span>
                    <span className="rounded-full border border-primary/10 bg-muted px-3 py-1 text-xs font-semibold text-primary">
                      Animation Systems
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                    <Item
                      variant="default"
                      size="xs"
                      className="w-auto border-0 p-0"
                    >
                      <ItemMedia variant="icon">
                        <Star className="size-4 fill-amber-500 text-amber-500" />
                      </ItemMedia>
                      <ItemTitle className="text-sm font-medium text-foreground">
                        {collection.rating} ({collection.reviews} reviews)
                      </ItemTitle>
                    </Item>
                    <Item
                      variant="default"
                      size="xs"
                      className="w-auto border-0 p-0"
                    >
                      <ItemMedia variant="icon">
                        <Users className="size-4" />
                      </ItemMedia>
                      <ItemTitle className="text-sm font-medium">
                        {collection.students} students
                      </ItemTitle>
                    </Item>
                    <Item
                      variant="default"
                      size="xs"
                      className="w-auto border-0 p-0"
                    >
                      <ItemMedia variant="icon">
                        <Clock3 className="size-4" />
                      </ItemMedia>
                      <ItemTitle className="text-sm font-medium">
                        {collection.totalDuration}
                      </ItemTitle>
                    </Item>
                  </div>
                </div>

                <Card className="h-fit rounded-2xl border-border/40 bg-background/60 shadow-xs backdrop-blur">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <Image
                        src={collection.author.image ?? collection.thumbnailUrl}
                        alt={collection.author.name}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {collection.author.name}
                        </p>
                        <p className="text-3xs font-semibold tracking-wide text-primary uppercase">
                          {collection.author.role}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {collection.author.bio}
                    </p>

                    <Button
                      variant="secondary"
                      className="w-full font-semibold"
                    >
                      Follow Instructor
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="mb-8 flex border-b border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab("description")}
                    className={
                      activeTab === "description"
                        ? "border-b-2 border-primary px-6 py-4 text-sm font-bold text-primary"
                        : "px-6 py-4 text-sm font-medium text-foreground/60 hover:text-foreground"
                    }
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("resources")}
                    className={
                      activeTab === "resources"
                        ? "border-b-2 border-primary px-6 py-4 text-sm font-bold text-primary"
                        : "px-6 py-4 text-sm font-medium text-foreground/60 hover:text-foreground"
                    }
                  >
                    Resources ({selectedTutorial.resources.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("discussion")}
                    className={
                      activeTab === "discussion"
                        ? "border-b-2 border-primary px-6 py-4 text-sm font-bold text-primary"
                        : "px-6 py-4 text-sm font-medium text-foreground/60 hover:text-foreground"
                    }
                  >
                    Discussion
                  </button>
                </div>

                {activeTab === "description" ? (
                  <Card className="space-y-4 rounded-2xl bg-card p-6 shadow-none">
                    {selectedTutorial.description.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="leading-relaxed text-foreground/75"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </Card>
                ) : null}

                {activeTab === "resources" ? (
                  <div className="space-y-3">
                    {selectedTutorial.resources.length > 0 ? (
                      selectedTutorial.resources.map(
                        (resource: TutorialResourceItem) => (
                          <Card
                            key={resource.slug}
                            className="rounded-2xl bg-card p-5 shadow-none"
                          >
                            <div className="flex items-start gap-4">
                              <Image
                                src={resource.image}
                                alt={resource.title}
                                width={72}
                                height={72}
                                className="h-18 w-18 rounded-xl object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">
                                  {resource.title}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                                  {resource.description}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                  <Button size="sm" variant="secondary" asChild>
                                    <a
                                      href={resource.sourcePath}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                    >
                                      Open
                                    </a>
                                  </Button>
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={resource.sourcePath} download>
                                      Download
                                    </a>
                                  </Button>
                                </div>
                                <div className="text-3xs mt-3 flex items-center justify-between gap-3 font-semibold tracking-wide text-muted-foreground uppercase">
                                  <span>
                                    {resource.fileType} • {resource.kind}
                                  </span>
                                  <span>{resource.author}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      )
                    ) : (
                      <Card className="rounded-2xl bg-card p-5 shadow-none">
                        <p className="text-sm text-foreground/70">
                          No resources yet.
                        </p>
                      </Card>
                    )}
                  </div>
                ) : null}

                {activeTab === "discussion" ? (
                  <div className="space-y-3">
                    {selectedTutorial.discussion.length > 0 ? (
                      selectedTutorial.discussion.map(
                        (item: TutorialDiscussionItem) => (
                          <Card
                            key={`${item.author}-${item.postedAt}`}
                            className="space-y-2 rounded-2xl bg-card p-5 shadow-none"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">
                                {item.author}
                              </p>
                              <p className="text-xs font-medium text-foreground/50">
                                {item.postedAt}
                              </p>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/75">
                              {item.message}
                            </p>
                          </Card>
                        )
                      )
                    ) : (
                      <Card className="rounded-2xl bg-card p-5 shadow-none">
                        <p className="text-sm text-foreground/70">
                          No discussion yet. Be the first to ask a question.
                        </p>
                      </Card>
                    )}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:col-span-3">
          <Card className="sticky top-24 h-[calc(100vh-140px)] overflow-hidden border-border/40 bg-background/50 shadow-lg backdrop-blur-xl md:rounded-3xl">
            <CardContent className="flex h-full flex-col p-0">
              <div className="space-y-4 border-b border-border/40 bg-card/30 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Tutorials
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground">
                    {completedTutorials} / {collection.tutorials.length}{" "}
                    tutorials
                  </p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    type="text"
                    placeholder="Search tutorials..."
                    className="h-10 w-full rounded-full border border-border/50 bg-background/60 pl-10 text-sm shadow-xs transition-shadow outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                    <p className="text-3xs font-bold tracking-wider text-muted-foreground uppercase">
                      Section 1: Core Tutorials
                    </p>
                    <PlayCircle className="size-4 text-muted-foreground" />
                  </div>

                  <div className="space-y-1">
                    {collection.tutorials.map((tutorial, index) => {
                      const isCompleted =
                        index < Math.max(0, completedTutorials - 1)
                      const isActive = index === selectedTutorialIndex

                      return (
                        <button
                          key={tutorial.id}
                          type="button"
                          onClick={() => setSelectedTutorialIndex(index)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted",
                            isActive
                              ? "border-l-4 border-primary bg-primary/5"
                              : undefined
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="size-5 shrink-0 text-primary" />
                          ) : (
                            <PlayCircle
                              className={cn(
                                "size-5 shrink-0",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground/70"
                              )}
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-xs font-medium text-foreground/80",
                                isActive ? "font-bold text-primary" : undefined
                              )}
                            >
                              {String(index + 1).padStart(2, "0")}.{" "}
                              {tutorial.title}
                            </p>
                            <p className="text-3xs text-muted-foreground">
                              {tutorial.duration}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 bg-card/40 p-5 backdrop-blur">
                <Button
                  className="w-full font-semibold"
                  size="lg"
                  onClick={handleDownloadAllResources}
                  disabled={
                    isDownloading || selectedTutorial.resources.length === 0
                  }
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
      </div>
    </section>
  )
}
