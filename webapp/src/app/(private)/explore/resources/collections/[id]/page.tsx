import type { Metadata } from "next"

import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
  Bolt,
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  FolderOpen,
  Lock,
  LockOpen,
  ShieldCheck,
  Star,
} from "lucide-react"

import { MetaChip } from "@/components/atoms/meta-chip"
import { UserAvatar } from "@/components/atoms/user-avatar"
import { CardPrice } from "@/components/molecules/card-price"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"
import { PurchaseButton } from "@/features/billing"
import {
  getResourceCollectionBySlug,
  LearningPathOverview,
} from "@/features/content"
import {
  ItemInteractionControls,
  TrackContentView,
} from "@/features/interaction"

type PageParams = Promise<{ id: string }>

const vndFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
})

function formatPrice(price: number) {
  return price === 0 ? "Free" : vndFormat.format(price)
}

function applyDiscount(price: number, discount: number) {
  const safeDiscount = Math.min(Math.max(discount || 0, 0), 100)
  return Math.max(0, Math.round(price * (1 - safeDiscount / 100)))
}

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { id } = await params
  const collection = await getResourceCollectionBySlug(id)

  if (!collection) {
    return {
      title: "Resource Collection Not Found",
      description:
        "The resource collection you are looking for does not exist.",
    }
  }

  const canonical = `/explore/resources/collections/${id}`

  return {
    title: `${collection.title} | Resource Collection`,
    description: collection.description.substring(0, 160),
    alternates: {
      canonical,
    },
    openGraph: {
      title: collection.title,
      description: collection.description.substring(0, 160),
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: collection.title,
      description: collection.description.substring(0, 160),
    },
  }
}

export default async function ExploreCollectionResourceDetailPage({
  params,
}: {
  params: PageParams
}) {
  const { id } = await params
  const collection = await getResourceCollectionBySlug(id)

  if (!collection) {
    notFound()
  }

  const collectionTitle = collection.title
  const collectionOriginalPrice = collection.originalPrice ?? 0
  const collectionFinalPrice =
    collection.discountedPrice ??
    applyDiscount(collectionOriginalPrice, collection.discount)
  const collectionPricing = {
    originalPrice: formatPrice(collectionOriginalPrice),
    discountLabel:
      collection.discount > 0 ? `${collection.discount}% OFF` : undefined,
    finalPrice:
      collection.discount > 0 ? formatPrice(collectionFinalPrice) : undefined,
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"
  const canonical = `/explore/resources/collections/${id}`

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: collectionTitle,
    description: collection.description,
    url: `${siteUrl}${canonical}`,
    category: "Educational Resource Collection",
    offers: {
      "@type": "Offer",
      price: collectionFinalPrice.toString(),
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
    },
    provider: {
      "@type": "Person",
      name: collection.uploader?.nickname || collection.userId,
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
        name: "Resource Collections",
        item: `${siteUrl}/explore/resources/collections`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: collectionTitle,
        item: `${siteUrl}${canonical}`,
      },
    ],
  }

  return (
    <section className="space-y-10 pb-12">
      <TrackContentView
        itemId={collection.id}
        itemType="RESOURCE_COLLECTION"
        majorId={collection.majorId}
        courseId={collection.courseId}
        semester={collection.course?.semester}
      />
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ── Header ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
          {collection.course?.name ?? "Collection"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {collectionTitle}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {collection.description || "No description provided."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* ── Main Content ── */}
        <div className="space-y-10 lg:col-span-8">
          {/* ── Thumbnail Card (16:9 — matches ThumbnailPicker crop ratio) ── */}
          <Card className="group relative overflow-hidden rounded-2xl border-border/30 bg-card p-0 shadow-sm">
            <div className="relative aspect-video w-full bg-muted">
              {collection.thumbnailUrl ? (
                <Image
                  fill
                  src={collection.thumbnailUrl}
                  alt={`${collectionTitle} cover`}
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FolderOpen className="size-16 text-muted-foreground/50" />
                </div>
              )}

              {collection.discount > 0 && (
                <span className="absolute top-4 left-4 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-wider text-primary-foreground uppercase shadow-md">
                  {collection.discount}% OFF
                </span>
              )}
            </div>

            <div className="absolute right-0 bottom-0 left-0 flex items-center justify-between border-t border-muted/20 bg-card/80 px-8 py-6 backdrop-blur-md">
              <Item
                variant="default"
                size="sm"
                className="w-auto border-0 bg-transparent p-0 text-sm font-medium text-foreground"
              >
                <ItemMedia variant="icon">
                  <ShieldCheck className="size-5 text-primary" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium">
                  {collection._count.resources} Resources ·{" "}
                  {collection._count.tutorials} Tutorials included
                </ItemTitle>
              </Item>
              <Button
                variant="ghost"
                size="sm"
                className="font-bold text-primary hover:bg-transparent"
              >
                Browse Items
              </Button>
            </div>
          </Card>

          {/* ── Title + Stats Row ── */}
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
              {collectionTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground">
              <ItemInteractionControls
                itemId={collection.id}
                itemType="RESOURCE_COLLECTION"
              />
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-foreground">
                  —
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <FolderOpen className="size-4 text-primary" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {collection._count.resources} Resources
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Database className="size-4" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {collection._count.tutorials} Tutorials
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <CalendarDays className="size-4" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  Updated{" "}
                  {new Date(collection.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </ItemTitle>
              </Item>
            </div>
          </div>

          {/* ── Author Bar ── */}
          <div className="flex items-center justify-between rounded-xl border border-border/20 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <UserAvatar
                src={collection.uploader?.avatarUrl}
                name={collection.uploader?.nickname ?? "U"}
                className="size-12"
              />
              <div>
                <p className="font-bold text-foreground">
                  {collection.uploader?.nickname || "Expert Buddy"}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {collection.uploader?.career?.name || "Content Creator"}
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

          <LearningPathOverview
            phases={collection.phases}
            resourceCount={collection._count.resources}
            tutorialCount={collection._count.tutorials}
          />

          {/* ── About + Highlights ── */}
          <div className="space-y-6 text-muted-foreground">
            <h3 className="text-2xl font-bold text-foreground">
              About this Collection
            </h3>
            <p className="text-lg leading-relaxed">
              {collection.description || "No description provided."}
            </p>

            {collection.hightlights.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {collection.hightlights.map((highlight) => (
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
            )}
          </div>

          {/* ── Collection Items (Roadmap Phases) ── */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground">
              Collection Items
            </h3>

            {collection.phases && collection.phases.length > 0 ? (
              <div className="space-y-3">
                {collection.phases.map((phase, phaseIdx) => {
                  const totalItems = phase.items.length
                  return (
                    <div
                      key={`${collection.id}-${phase.phaseTitle}`}
                      className="overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-border/20 bg-muted/50 px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {phaseIdx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-foreground">
                              {phase.phaseTitle}
                            </h4>
                            {phase.learningGoal && (
                              <p className="text-xs text-muted-foreground">
                                {phase.learningGoal}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {totalItems} {totalItems === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <div className="divide-y divide-border/20">
                        {phase.items.map((item, itemIdx) => (
                          <div
                            key={item.itemId}
                            className={`flex items-center justify-between px-5 py-3 transition ${
                              itemIdx === 0
                                ? "bg-card hover:bg-muted/30"
                                : "bg-muted/10"
                            }`}
                          >
                            <div
                              className={`flex items-center gap-4 ${itemIdx === 0 ? "" : "opacity-70"}`}
                            >
                              <div
                                className={`flex size-9 items-center justify-center rounded-lg ${
                                  item.itemType === "TUTORIAL"
                                    ? "bg-accent/10 text-accent"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                <FileText className="size-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">
                                  {item.itemType === "TUTORIAL"
                                    ? "Tutorial"
                                    : "Resource"}{" "}
                                  #{itemIdx + 1}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.itemType}
                                </p>
                              </div>
                            </div>
                            {itemIdx === 0 ? (
                              <div className="flex items-center gap-5">
                                <span className="text-sm font-bold text-primary">
                                  Preview
                                </span>
                                <LockOpen className="size-5 text-muted-foreground" />
                              </div>
                            ) : (
                              <Lock className="size-5 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── Empty State ── */
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 bg-muted/20 py-16 text-center">
                <FolderOpen className="mb-4 size-12 text-muted-foreground/40" />
                <h4 className="text-lg font-bold text-foreground">
                  No items yet
                </h4>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  This collection doesn&apos;t have any resources or tutorials
                  added yet. Check back later!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <Card className="rounded-2xl border border-border/20 bg-card p-8 shadow-sm">
              <div className="mb-6">
                <CardPrice
                  price={formatPrice(collectionOriginalPrice)}
                  pricing={collectionPricing}
                  align="start"
                />
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <Item
                    variant="default"
                    size="xs"
                    className="w-auto border-0 p-0"
                  >
                    <ItemMedia variant="icon">
                      <FolderOpen className="size-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium">
                      Resources
                    </ItemTitle>
                  </Item>
                  <span className="font-bold">
                    {collection._count.resources}
                  </span>
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
                      Tutorials
                    </ItemTitle>
                  </Item>
                  <span className="font-bold">
                    {collection._count.tutorials}
                  </span>
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
                    <ItemTitle className="text-sm font-medium">Type</ItemTitle>
                  </Item>
                  <span className="font-bold capitalize">
                    {collection.type.toLowerCase()}
                  </span>
                </div>
              </div>

              <PurchaseButton
                itemId={collection.id}
                itemType="RESOURCE_COLLECTION"
                label="Buy collection"
                freeLabel="Get collection"
                className="mb-4 w-full text-base font-bold"
                price={collectionFinalPrice}
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
                <div className="space-y-3">
                  <Item
                    variant="default"
                    size="xs"
                    className="border-0 p-0 text-muted-foreground"
                  >
                    <ItemMedia variant="icon">
                      <CheckCircle2 className="size-4 text-primary" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium text-muted-foreground">
                      Instant Download
                    </ItemTitle>
                  </Item>
                  <Item
                    variant="default"
                    size="xs"
                    className="border-0 p-0 text-muted-foreground"
                  >
                    <ItemMedia variant="icon">
                      <Bolt className="size-4 text-primary" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium text-muted-foreground">
                      Lifetime Access
                    </ItemTitle>
                  </Item>
                  <Item
                    variant="default"
                    size="xs"
                    className="border-0 p-0 text-muted-foreground"
                  >
                    <ItemMedia variant="icon">
                      <CheckCircle2 className="size-4 text-primary" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium text-muted-foreground">
                      30-day Quality Guarantee
                    </ItemTitle>
                  </Item>
                </div>
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
                  Verified Collection
                </ItemTitle>
              </Item>
              <p className="text-xs text-muted-foreground">
                This collection has been reviewed by the Buddy Academic Board
                for accuracy and curriculum alignment.
              </p>
            </Card>

            <Card className="rounded-2xl border border-border/20 bg-muted/40 p-6">
              <h3 className="mb-4 font-bold text-foreground">
                Related content
              </h3>
              <Link href="/explore/resources" className="group flex gap-4">
                <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                    Browse All Resources
                  </h4>
                  <p className="text-xs font-medium text-muted-foreground">
                    Explore more
                  </p>
                </div>
              </Link>
            </Card>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MetaChip>Major: {collection.major?.name ?? "#"}</MetaChip>
        <MetaChip>Course: {collection.course?.name ?? "#"}</MetaChip>
        <MetaChip>Semester: {collection.course?.semester ?? "#"}</MetaChip>
      </div>
    </section>
  )
}
