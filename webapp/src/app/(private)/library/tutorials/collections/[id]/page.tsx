import type { Metadata } from "next"

import Link from "next/link"
import { notFound } from "next/navigation"

import { ArrowRight, FolderKanban, Video } from "lucide-react"

import { LibraryBackButton } from "@/components/atoms/library-back-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getLibraryTutorialCollectionBySlug } from "@/features/content"
import { getSeoContent } from "@/features/seo/services/seo-content"

type PageParams = Promise<{ id: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent("library-tutorials-collections-:id"),
  ])
  const canonical = `/library/tutorials/collections/${id}`

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
      type: "article",
    },
  }
}

export default async function LibraryTutorialCollectionDetailPage({
  params,
}: {
  params: PageParams
}) {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent("library-tutorials-collections-:id"),
  ])
  const collection = await getLibraryTutorialCollectionBySlug(id)

  if (!collection) {
    notFound()
  }

  const resourceCount = collection.resourceIds?.length ?? 0

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4">
        <LibraryBackButton
          variant="ghost"
          size="sm"
          label="Back to Library"
          fallbackHref="/library"
          className="w-fit"
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 text-xs font-semibold tracking-wide uppercase"
              >
                <FolderKanban className="size-3" />
                Tutorial Collection
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {resourceCount} {resourceCount === 1 ? "Tutorial" : "Tutorials"}
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {collection.title}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {collection.description || seo.description}
            </p>
          </div>

          {collection.discount ? (
            <Badge variant="secondary" className="w-fit text-sm font-semibold">
              {collection.discount}% OFF
            </Badge>
          ) : null}
        </div>
      </div>

      {collection.hightlights && collection.hightlights.length > 0 ? (
        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-4 p-6">
            <p className="text-xs font-extrabold tracking-widest text-foreground/40 uppercase">
              Highlights
            </p>
            <ul className="space-y-2">
              {collection.hightlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-2 text-sm text-foreground/70"
                >
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <p className="mb-4 text-xs font-extrabold tracking-widest text-foreground/40 uppercase">
          Tutorials in this collection
        </p>
        {resourceCount > 0 ? (
          <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collection.resourceIds.map((tutorialId) => (
              <Card
                key={tutorialId}
                className="flex h-full flex-col transition-all hover:shadow-md"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Video className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      Tutorial
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tutorialId}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto border-t p-3">
                  <Link
                    href={`/library/tutorials/${tutorialId}`}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Watch tutorial
                    <ArrowRight className="size-3" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No tutorials found in this collection.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
