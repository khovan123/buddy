import type { Metadata } from "next"

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  ShieldCheck,
  ShoppingCart,
  Star,
} from "lucide-react"

import { MetaChip } from "@/components/atoms/meta-chip"
import { UserAvatar } from "@/components/atoms/user-avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"
import { PurchaseButton } from "@/features/billing"
import { ResourceDocumentPreview } from "@/features/content"
import {
  getResourceBySlug,
  getResourcePreview,
} from "@/features/content"
import { ItemInteractionControls, TrackContentView } from "@/features/interaction"

type PageParams = Promise<{ id: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { id } = await params

  const resource = await getResourceBySlug(id)
  if (!resource) {
    return {
      title: "Resource Not Found",
      description: "The resource you are looking for does not exist.",
    }
  }

  const canonical = `/explore/resources/${id}`

  return {
    title: resource.title,
    description: resource.summary?.substring(0, 160) || "",
    alternates: {
      canonical,
    },
    openGraph: {
      title: resource.title,
      description: resource.summary?.substring(0, 160) || "",
      url: canonical,
      type: "article",
    },
  }
}

export default async function ExploreResourceDetailPage({
  params,
}: {
  params: PageParams
}) {
  const { id } = await params

  const [resource, previewData] = await Promise.all([
    getResourceBySlug(id),
    getResourcePreview(id).catch(() => null),
  ])
  if (!resource) {
    notFound()
  }

  const resourceTitle = resource.title

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://unibuddy.app"
  const canonical = `/explore/resources/${id}`

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: resourceTitle,
    description: resource.summary || "",
    url: `${siteUrl}${canonical}`,
    category: "Educational Resource",
    offers: {
      "@type": "Offer",
      price: resource.price?.toString() || "0",
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
    },
    provider: {
      "@type": "Person",
      name: resource.uploader?.nickname || resource.userId,
    },
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Explore",
        item: `${siteUrl}/explore`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Resources",
        item: `${siteUrl}/explore/resources`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: resourceTitle,
        item: `${siteUrl}${canonical}`,
      },
    ],
  }

  return (
    <section className="space-y-10 pb-12">
      <TrackContentView
        itemId={resource.id}
        itemType="RESOURCE"
        majorId={resource.majorId}
        courseId={resource.courseId}
        semester={resource.course?.semester}
      />
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
          {resource.courseId}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {resourceTitle}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {resource.summary || "No summary provided."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          <ResourceDocumentPreview
            resourceId={id}
            thumbnailUrl={resource.thumbnailUrl}
            title={resourceTitle}
            sourceLabel={resource.major?.name || "Resource"}
            description={resource.summary || "No summary provided."}
            author={resource.uploader?.nickname || "Expert Buddy"}
            updatedAt={new Date(resource.updatedAt).toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}
            pageCountHint={`${resource._count.resourceMeta || 1} pages`}
            fileSize={"—"} // TODO: compute if needed
            highlights={resource.hightlights || []}
            previewData={previewData}
          />

          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
              {resourceTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground">
              <ItemInteractionControls
                itemId={resource.id}
                itemType="RESOURCE"
                initialStats={{
                  purchaseCount: resource._count.resourceOrders,
                }}
              />
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-foreground">
                  {resource._count.resourceOrders} orders
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <ShoppingCart className="size-4 text-primary" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {resource._count.resourceOrders}+ Downloads
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <CalendarDays className="size-4" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  Updated{" "}
                  {new Date(resource.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </ItemTitle>
              </Item>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/20 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-4">
              {/* <Image
                src={
                  resource.uploader?.avatarUrl ||
                  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4"
                }
                alt="Creator avatar"
                width={48}
                height={48}
                className="rounded-full object-cover"
              /> */}
              <UserAvatar
                src={resource.uploader?.avatarUrl}
                name={resource.uploader?.nickname ?? "U"}
                className="size-12"
              />

              <div>
                <p className="font-bold text-foreground">
                  {resource.uploader?.nickname || "Expert Buddy"}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {resource.uploader?.career?.name || "Content Creator"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="font-bold text-primary hover:bg-primary/5"
            >
              Follow
            </Button>
          </div>

          <div className="space-y-6 text-muted-foreground">
            <h3 className="text-2xl font-bold text-foreground">
              About this Resource
            </h3>
            <p className="text-lg leading-relaxed">
              {resource.summary || "No summary provided."}
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(resource.hightlights || []).map((highlight) => (
                <Alert
                  key={highlight}
                  className="border-border/30 bg-background/70 py-2"
                >
                  <CheckCircle2 className="size-5 text-primary" />
                  <AlertDescription className="text-foreground">
                    {highlight}
                  </AlertDescription>
                </Alert>
              ))}
            </div>

            <div className="pt-2">
              <h4 className="mb-2 font-bold text-foreground">
                Technical Information
              </h4>
              <p>
                This document is provided as a high-resolution, searchable PDF.
                It is optimized for both digital viewing on tablets and
                professional printing in A4 format.
              </p>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <Card className="rounded-2xl border border-border/20 bg-card p-8 shadow-sm">
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-foreground">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(resource.price || 0)}
                </span>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <Item
                    variant="default"
                    size="xs"
                    className="w-auto border-0 p-0"
                  >
                    <ItemMedia variant="icon">
                      <FileText className="size-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium">
                      Format
                    </ItemTitle>
                  </Item>
                  <span className="font-bold">PDF</span>
                </div>
                <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <Item
                    variant="default"
                    size="xs"
                    className="w-auto border-0 p-0"
                  >
                    <ItemMedia variant="icon">
                      <Database className="size-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium">
                      File Size
                    </ItemTitle>
                  </Item>
                  <span className="font-bold">—</span>
                </div>
                <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <Item
                    variant="default"
                    size="xs"
                    className="w-auto border-0 p-0"
                  >
                    <ItemMedia variant="icon">
                      <FileText className="size-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium">
                      Total Pages
                    </ItemTitle>
                  </Item>
                  <span className="font-bold">
                    {resource._count.resourceMeta} documents
                  </span>
                </div>
              </div>

              <PurchaseButton
                itemId={resource.id}
                itemType="RESOURCE"
                className="mb-4 w-full text-base font-bold"
              />
              <div className="flex justify-center">
                <Item
                  variant="default"
                  size="xs"
                  className="w-auto border-0 p-0 text-xs text-muted-foreground"
                >
                  <ItemMedia variant="icon">
                    <ShieldCheck className="size-4" />
                  </ItemMedia>
                  <ItemTitle className="text-xs font-medium text-muted-foreground">
                    Secure encrypted payment
                  </ItemTitle>
                </Item>
              </div>

              <CardContent className="mt-8 rounded-lg border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm leading-tight font-semibold text-foreground">
                  Browse more resources in this subject.
                </p>
                <Link
                  href="/explore/resources/collections"
                  className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
                >
                  View Collections
                </Link>
              </CardContent>
            </Card>

            <Card className="rounded-xl bg-muted p-6">
              <Item
                variant="default"
                size="xs"
                className="mb-2 w-auto border-0 p-0"
              >
                <ItemMedia variant="icon">
                  <ShieldCheck className="size-5" />
                </ItemMedia>
                <ItemTitle className="text-sm font-bold text-foreground">
                  Verified Resource
                </ItemTitle>
              </Item>
              <p className="text-xs text-muted-foreground">
                This document has been reviewed by the Unibuddy Academic Board
                for accuracy and curriculum alignment.
              </p>
            </Card>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MetaChip>Major: {resource.major?.name ?? "#"}</MetaChip>
        <MetaChip>Course: {resource.course?.name ?? "#"}</MetaChip>
        <MetaChip>Semester: {resource.course?.semester ?? "#"}</MetaChip>
      </div>
    </section>
  )
}
