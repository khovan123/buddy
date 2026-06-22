import type { Metadata } from "next"

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  BadgeHelp,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Heart,
  Lock,
  LockOpen,
  Share2,
  ShieldCheck,
  Smartphone,
  Star,
  UserPlus,
  Video,
  Wallet,
} from "lucide-react"

import { MetaChip } from "@/components/atoms/meta-chip"
import { UserAvatar } from "@/components/atoms/user-avatar"
import { CardPrice } from "@/components/molecules/card-price"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Toggle } from "@/components/ui/toggle"
import { PurchaseButton } from "@/features/billing"
import {
  getResourcePreview,
  getTutorialBySlug,
  TutorialResourcePreviewDialog,
  TutorialVideoPlayer,
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

  const tutorial = await getTutorialBySlug(id)
  if (!tutorial) {
    return {
      title: "Tutorial Not Found",
      description: "The tutorial you are looking for does not exist.",
    }
  }

  const canonical = `/explore/tutorials/${id}`

  return {
    title: `${tutorial.title} | Tutorial`,
    description: tutorial.description.substring(0, 160),
    alternates: {
      canonical,
    },
    openGraph: {
      title: tutorial.title,
      description: tutorial.description.substring(0, 160),
      url: canonical,
      type: "video.other",
      ...(tutorial.thumbnailUrl && {
        images: [{ url: tutorial.thumbnailUrl }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: tutorial.title,
      description: tutorial.description.substring(0, 160),
    },
  }
}

export default async function ExploreTutorialDetailPage({
  params,
}: {
  params: PageParams
}) {
  const { id } = await params

  const tutorial = await getTutorialBySlug(id)
  if (!tutorial) {
    notFound()
  }

  // Extract the slug of the first resource for preview fetching.
  // The preview endpoint requires a slug, not a MongoDB ObjectId.
  let firstResourceSlug: string | null = null
  if (
    tutorial.steps &&
    tutorial.steps.length > 0 &&
    tutorial.steps[0].resources.length > 0
  ) {
    firstResourceSlug = tutorial.steps[0].resources[0].resource?.slug ?? null
  } else if (tutorial.resources && tutorial.resources.length > 0) {
    firstResourceSlug = tutorial.resources[0].slug ?? null
  }

  const previewData = firstResourceSlug
    ? await getResourcePreview(firstResourceSlug).catch(() => null)
    : null

  const courseTitle = tutorial.title
  const tutorialFinalPrice = applyDiscount(
    tutorial.price,
    tutorial.discountBundle
  )
  const tutorialPricing = {
    originalPrice: formatPrice(tutorial.price),
    discountLabel:
      tutorial.discountBundle > 0
        ? `${tutorial.discountBundle}% OFF`
        : undefined,
    finalPrice:
      tutorial.discountBundle > 0 ? formatPrice(tutorialFinalPrice) : undefined,
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"
  const canonical = `/explore/tutorials/${id}`

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: courseTitle,
    description: tutorial.description,
    url: `${siteUrl}${canonical}`,
    provider: {
      "@type": "Organization",
      name: "Buddy",
      url: siteUrl,
    },
    instructor: {
      "@type": "Person",
      name: tutorial.uploader?.nickname || tutorial.userId,
      jobTitle: "Creator",
    },
    offers: {
      "@type": "Offer",
      price: tutorial.price.toString(),
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
    },
    inLanguage: ["vi", "en"],
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
        name: "Tutorials",
        item: `${siteUrl}/explore/tutorials`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: courseTitle,
        item: `${siteUrl}${canonical}`,
      },
    ],
  }

  return (
    <section className="space-y-10 pb-12">
      <TrackContentView
        itemId={tutorial.id}
        itemType="TUTORIAL"
        majorId={tutorial.majorId}
        courseId={tutorial.courseId}
        semester={tutorial.course?.semester}
      />
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ── Header ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
          {tutorial.course?.name ?? "Tutorial"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {courseTitle}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {tutorial.description || "No description provided."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* ── Main Content ── */}
        <div className="space-y-10 lg:col-span-8">
          {/* ── Thumbnail / Video Card ── */}
          <Card className="group relative overflow-hidden rounded-2xl border-border/30 bg-card p-0 shadow-sm">
            <TutorialVideoPlayer
              thumbnailUrl={tutorial.thumbnailUrl}
              trailerUrl={tutorial.trailerUrl}
              title={courseTitle}
            />

            <div className="flex items-center justify-between border-t border-muted/20 bg-card/80 px-8 py-6 backdrop-blur-md">
              <Item
                variant="default"
                size="sm"
                className="w-auto border-0 bg-transparent p-0 text-sm font-medium text-foreground"
              >
                <ItemMedia variant="icon">
                  <ShieldCheck className="size-5 text-primary" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium">
                  {tutorial._count.tutorialMedia > 0
                    ? "Media Attached"
                    : "No Media"}{" "}
                  · {tutorial._count.tutorialOrders} Orders
                </ItemTitle>
              </Item>
              {tutorial.trailerUrl && (
                <Link href={tutorial.trailerUrl} target="_blank">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-bold text-primary hover:bg-transparent"
                  >
                    Watch Trailer
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          {/* ── Title + Stats Row ── */}
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
              {courseTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground">
              <ItemInteractionControls
                itemId={tutorial.id}
                itemType="TUTORIAL"
                initialStats={{
                  purchaseCount: tutorial._count.tutorialOrders,
                }}
              />
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-foreground">
                  {tutorial._count.tutorialOrders} orders
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Clock3 className="size-4 text-primary" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {tutorial._count.tutorialMedia > 0
                    ? "Media Attached"
                    : "No Media"}
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <CalendarDays className="size-4" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  Updated{" "}
                  {new Date(tutorial.updatedAt).toLocaleDateString("en-US", {
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
                src={tutorial.uploader?.avatarUrl}
                name={tutorial.uploader?.nickname ?? "U"}
                className="size-12"
              />
              <div>
                <p className="font-bold text-foreground">
                  {tutorial.uploader?.nickname || "Expert Buddy"}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {tutorial.uploader?.career?.name || "Content Creator"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="font-bold text-primary hover:bg-primary/5"
            >
              <UserPlus className="mr-2 size-4" />
              Follow
            </Button>
          </div>

          {/* ── About + Highlights ── */}
          <div className="space-y-6 text-muted-foreground">
            <h3 className="text-2xl font-bold text-foreground">
              About this Tutorial
            </h3>
            <p className="text-lg leading-relaxed">
              {tutorial.description || "No description provided."}
            </p>

            {tutorial.hightlights.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tutorial.hightlights.map((highlight) => (
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

          {/* ── Tutorial Resources (Steps / Attached Resources) ── */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground">
              Tutorial Resources
            </h3>

            {tutorial.steps && tutorial.steps.length > 0 ? (
              <div className="space-y-3">
                {tutorial.steps.map((step, stepIdx) => {
                  const totalItems = step.resources.length
                  return (
                    <div
                      key={`${tutorial.id}-step-${step.title}`}
                      className="overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-border/20 bg-muted/50 px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {stepIdx + 1}
                          </span>
                          <h4 className="font-bold text-foreground">
                            {step.title}
                          </h4>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {totalItems}{" "}
                          {totalItems === 1 ? "resource" : "resources"}
                        </span>
                      </div>
                      <div className="divide-y divide-border/20">
                        {step.resources.map((res, resIdx) => (
                          <div
                            key={res.resourceId}
                            className={`flex items-center justify-between px-5 py-3 transition ${
                              resIdx === 0
                                ? "bg-card hover:bg-muted/30"
                                : "bg-muted/10"
                            }`}
                          >
                            <div
                              className={`flex items-center gap-4 ${resIdx === 0 ? "" : "opacity-70"}`}
                            >
                              <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                                <FileText className="size-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">
                                  {res.resource?.title ||
                                    `Resource #${resIdx + 1}`}
                                </p>
                                {(res.instructionNote ||
                                  res.resource?.summary) && (
                                  <p className="line-clamp-2 text-xs text-muted-foreground">
                                    {res.instructionNote ||
                                      res.resource?.summary}
                                  </p>
                                )}
                              </div>
                            </div>
                            {resIdx === 0 ? (
                              <TutorialResourcePreviewDialog
                                previewData={previewData}
                                title={
                                  res.resource?.title ||
                                  `Resource #${resIdx + 1}`
                                }
                                description={
                                  res.instructionNote || res.resource?.summary
                                }
                                author={tutorial.uploader?.nickname}
                              >
                                <button className="flex cursor-pointer items-center gap-5 transition-opacity hover:opacity-80">
                                  <span className="text-sm font-bold text-primary">
                                    Preview
                                  </span>
                                  <LockOpen className="size-5 text-muted-foreground" />
                                </button>
                              </TutorialResourcePreviewDialog>
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
            ) : tutorial.resources && tutorial.resources.length > 0 ? (
              <div className="space-y-3">
                {tutorial.resources.map((resource, resIdx) => (
                  <div
                    key={resource._id}
                    className={`flex items-center justify-between rounded-xl border border-border/30 px-5 py-3 transition ${
                      resIdx === 0
                        ? "bg-card shadow-sm hover:bg-muted/30"
                        : "bg-muted/10"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-4 ${resIdx === 0 ? "" : "opacity-70"}`}
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {resource.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resource.summary}
                        </p>
                      </div>
                    </div>
                    {resIdx === 0 ? (
                      <TutorialResourcePreviewDialog
                        previewData={previewData}
                        title={resource.title}
                        description={resource.summary}
                        author={tutorial.uploader?.nickname}
                      >
                        <button className="flex cursor-pointer items-center gap-5 transition-opacity hover:opacity-80">
                          <span className="text-sm font-bold text-primary">
                            Preview
                          </span>
                          <LockOpen className="size-5 text-muted-foreground" />
                        </button>
                      </TutorialResourcePreviewDialog>
                    ) : (
                      <Lock className="size-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* ── Empty State ── */
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 bg-muted/20 py-16 text-center">
                <FolderOpen className="mb-4 size-12 text-muted-foreground/40" />
                <h4 className="text-lg font-bold text-foreground">
                  No resources yet
                </h4>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  This tutorial doesn&apos;t have any attached resources yet.
                  Check back later!
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
                  price={formatPrice(tutorial.price)}
                  pricing={tutorialPricing}
                  align="start"
                />
              </div>

              <div className="mb-8 space-y-3">
                <PurchaseButton
                  itemId={tutorial.id}
                  itemType="TUTORIAL_BUNDLE"
                  label="Buy tutorial"
                  freeLabel="Start tutorial"
                  className="font-headline w-full py-4 font-bold shadow-lg"
                  price={tutorialFinalPrice}
                />
                <Button
                  variant="secondary"
                  className="font-headline w-full py-4 font-bold"
                  size="lg"
                >
                  Add to Cart
                </Button>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <Item
                    variant="default"
                    size="xs"
                    className="w-auto border-0 p-0"
                  >
                    <ItemMedia variant="icon">
                      <Video className="size-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium">Media</ItemTitle>
                  </Item>
                  <span className="font-bold">
                    {tutorial._count.tutorialMedia}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <Item
                    variant="default"
                    size="xs"
                    className="w-auto border-0 p-0"
                  >
                    <ItemMedia variant="icon">
                      <Star className="size-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium">
                      Orders
                    </ItemTitle>
                  </Item>
                  <span className="font-bold">
                    {tutorial._count.tutorialOrders}
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-primary"
                >
                  <Share2 className="size-4" />
                  Share
                </Button>
                <Toggle
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-transparent text-muted-foreground hover:text-primary aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
                  aria-label="Toggle bookmark"
                >
                  <Heart className="size-4 transition-colors group-data-[state=on]/toggle:fill-foreground" />
                  Save
                </Toggle>
              </div>

              <div className="mt-8 rounded-lg border border-primary/20 bg-primary/10 p-4">
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
                      30-Day Money Back Guarantee
                    </ItemTitle>
                  </Item>
                  <Item
                    variant="default"
                    size="xs"
                    className="border-0 p-0 text-muted-foreground"
                  >
                    <ItemMedia variant="icon">
                      <BadgeHelp className="size-4 text-primary" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium text-muted-foreground">
                      Full Lifetime Access
                    </ItemTitle>
                  </Item>
                  <Item
                    variant="default"
                    size="xs"
                    className="border-0 p-0 text-muted-foreground"
                  >
                    <ItemMedia variant="icon">
                      <Smartphone className="size-4 text-primary" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium text-muted-foreground">
                      Access on mobile and TV
                    </ItemTitle>
                  </Item>
                </div>
              </div>
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
                  Verified Tutorial
                </ItemTitle>
              </Item>
              <p className="text-xs text-muted-foreground">
                This tutorial has been reviewed by the Buddy Academic Board
                for accuracy and curriculum alignment.
              </p>
            </Card>

            <Card className="rounded-2xl border border-border/20 bg-primary/10 p-6 shadow-sm">
              <Item variant="default" size="sm" className="border-0 p-0">
                <ItemMedia variant="icon">
                  <Wallet className="size-8 text-primary" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-xs font-bold text-foreground">
                    Teams &amp; Enterprises
                  </ItemTitle>
                  <Link
                    href="/explore"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Get Buddy for Teams
                  </Link>
                </ItemContent>
              </Item>
            </Card>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MetaChip>Major: {tutorial.major?.name ?? "#"}</MetaChip>
        <MetaChip>Course: {tutorial.course?.name ?? "#"}</MetaChip>
        <MetaChip>Semester: {tutorial.course?.semester ?? "#"}</MetaChip>
      </div>
    </section>
  )
}
