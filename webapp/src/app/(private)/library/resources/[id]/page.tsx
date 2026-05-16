import type { Metadata } from "next"

import { notFound } from "next/navigation"

import { FileText } from "lucide-react"

import { LibraryBackButton } from "@/components/atoms/library-back-button"
import { MetaChip } from "@/components/atoms/meta-chip"
import { DocumentReader } from "@/components/organisms/document-reader"
import { getLibraryResourceBySlug } from "@/features/content/services/content.service"
import { getSeoContent } from "@/features/seo/services/seo-content"

type PageParams = Promise<{ id: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent("library-resources-:id"),
  ])
  const canonical = `/library/resources/${id}`

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function LibraryResourceDetailPage({
  params,
}: {
  params: PageParams
}) {
  const [{ id }, seo] = await Promise.all([
    params,
    getSeoContent("library-resources-:id"),
  ])
  const resource = await getLibraryResourceBySlug(id)

  if (!resource) {
    notFound()
  }

  const primaryMeta = resource.meta?.[0]
  const sourceUrl = primaryMeta?.downloadUrl || ""
  const extension = primaryMeta?.extension?.toUpperCase() || "FILE"
  const fileSize = primaryMeta?.fileSize
    ? formatFileSize(primaryMeta.fileSize)
    : "Unknown"

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <LibraryBackButton
          variant="ghost"
          size="sm"
          label="Back to library"
          fallbackHref="/library"
        />

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <MetaChip>Resource</MetaChip>
          <MetaChip>{extension}</MetaChip>
          <MetaChip>{resource.slug}</MetaChip>
        </div>
      </div>

      {sourceUrl ? (
        <DocumentReader
          title={resource.title}
          sourceUrl={sourceUrl}
          sourceLabel={seo.badge}
          description={resource.summary || seo.description}
          author={resource.userId}
          updatedAt={
            resource.updatedAt
              ? new Date(resource.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
          pageCountHint={`${extension} document`}
          fileSize={fileSize}
          format={extension}
          highlights={resource.hightlights || []}
          notes={[
            "This resource is from your personal library.",
            "Use the toolbar to adjust reading scale.",
          ]}
          isPreview={false}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <FileText className="size-4 text-primary" />
          <p>
            This resource is still processing. The file will be available once
            upload is complete.
          </p>
        </div>
      )}
    </section>
  )
}
