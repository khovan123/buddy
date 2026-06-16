import type { Metadata } from "next"

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Play,
  PlayCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react"

import { MetaChip } from "@/components/atoms/meta-chip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { PurchaseButton } from "@/features/billing"
import {
  ContentReceipt,
  FitAnalytics,
  getFitAwareFreeLabel,
  getFitAwarePurchaseLabel,
  getTutorialCollectionBySlug,
  HonestFitCard,
  LearningPathOverview,
} from "@/features/content"
import {
  ItemInteractionControls,
  TrackContentView,
} from "@/features/interaction"

type PageParams = Promise<{ id: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { id } = await params
  const collection = await getTutorialCollectionBySlug(id)

  if (!collection) {
    return {
      title: "Tutorial Collection Not Found",
      description:
        "The tutorial collection you are looking for does not exist.",
    }
  }

  const canonical = `/explore/tutorials/collections/${id}`

  return {
    title: `${collection.title} | Tutorial Collection`,
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

export default async function ExploreCollectionTutorialDetailPage({
  params,
}: {
  params: PageParams
}) {
  const { id } = await params
  const collection = await getTutorialCollectionBySlug(id)

  if (!collection) {
    notFound()
  }

  const collectionTitle = collection.title

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://unibuddy.app"
  const canonical = `/explore/tutorials/collections/${id}`
  const purchaseLabel = getFitAwarePurchaseLabel({
    contentType: "collection",
    fit: collection.learningFit,
  })

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: collectionTitle,
    description: collection.description,
    url: `${siteUrl}${canonical}`,
    provider: {
      "@type": "Organization",
      name: "Buddy",
      url: siteUrl,
    },
    instructor: {
      "@type": "Person",
      name: collection.userId,
      jobTitle: "Creator",
    },
    offers: {
      "@type": "Offer",
      price: collection.discount.toString(),
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
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
        name: "Tutorial Collections",
        item: `${siteUrl}/explore/tutorials/collections`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: collectionTitle,
        item: `${siteUrl}${canonical}`,
      },
    ],
  }

  const courseInclusions = [
    `${collection._count.tutorials} tutorial videos`,
    `${collection._count.resources} downloadable resources`,
    "Access on mobile and web",
    "Certificate of completion",
    "Lifetime access to updates",
  ]

  return (
    <section className="space-y-10 pb-12">
      <TrackContentView
        itemId={collection.id}
        itemType="TUTORIAL_COLLECTION"
        majorId={collection.majorId}
        courseId={collection.courseId}
        semester={collection.course?.semester}
      />
      <FitAnalytics
        event="fit_card_viewed"
        enabled={Boolean(collection.learningFit)}
        onceKey={`TUTORIAL_COLLECTION:${collection.id}`}
        payload={{
          itemId: collection.id,
          itemType: "TUTORIAL_COLLECTION",
          fitStatus: collection.learningFit?.fitStatus,
        }}
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
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-sm">
            <div className="font-mono text-muted-foreground">
              Collection Preview
            </div>
            <div className="absolute inset-0 bg-foreground/35" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Button size="icon-lg" className="size-20 rounded-full shadow-xl">
                <Play className="size-10 fill-current" />
              </Button>
            </div>

            <div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4">
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-xs font-semibold"
              >
                {collection._count.tutorials} Tutorials
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              >
                {collection.status}
              </Badge>
            </div>
          </section>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {collectionTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground">
              <ItemInteractionControls
                itemId={collection.id}
                itemType="TUTORIAL_COLLECTION"
              />
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                </ItemMedia>
                <ItemContent className="flex-row items-center gap-1 text-xs">
                  <ItemTitle className="text-sm font-semibold text-foreground">
                    —
                  </ItemTitle>
                  <ItemDescription className="text-sm">
                    (reviews)
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Clock3 className="size-4" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {collection._count.tutorials} tutorials
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <Users className="size-4" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {collection._count.resources} resources
                </ItemTitle>
              </Item>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/20 p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-muted shadow-sm">
                <Users className="size-11 text-primary" />
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">
                    {collection.userId}
                  </h3>
                  <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                    Collection Curator
                  </p>
                </div>

                <p className="max-w-3xl leading-relaxed text-muted-foreground">
                  Creator on Unibuddy Platform.
                </p>
              </div>
            </div>
          </div>

          <HonestFitCard
            fit={collection.learningFit}
            contentType="collection"
            analyticsPayload={{
              itemId: collection.id,
              itemType: "TUTORIAL_COLLECTION",
              contentType: "collection",
            }}
          />

          <LearningPathOverview
            phases={collection.phases}
            fit={collection.learningFit}
            resourceCount={collection._count.resources}
            tutorialCount={collection._count.tutorials}
          />

          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              About this Collection
            </h2>
            <div className="max-w-none space-y-4 leading-relaxed text-muted-foreground">
              <p>{collection.description}</p>

              {collection.hightlights.length > 0 ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {collection.hightlights.map((highlight) => (
                    <Alert
                      key={highlight}
                      className="border-border/40 bg-background/60 py-2"
                    >
                      <CheckCircle2 className="size-5 text-primary" />
                      <AlertDescription className="text-sm text-foreground">
                        {highlight}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="relative">
          <div className="sticky top-24 space-y-5">
            <Card className="overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm">
              <CardContent className="space-y-6 p-7">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-foreground">
                    {collection.discount > 0
                      ? `${collection.discount}% OFF`
                      : "Free"}
                  </span>
                </div>

                <ContentReceipt
                  fit={collection.learningFit}
                  fileCount={
                    collection._count.resources + collection._count.tutorials
                  }
                  updatedAt={collection.updatedAt}
                />

                <PurchaseButton
                  itemId={collection.id}
                  itemType="TUTORIAL_BUNDLE_COLLECTION"
                  label={purchaseLabel}
                  freeLabel={getFitAwareFreeLabel("collection")}
                  className="h-12 w-full text-base font-bold"
                  price={collection.discount > 0 ? collection.discount : 0}
                  trackingEventName="fit_cta_clicked"
                  trackingPayload={{
                    fitStatus: collection.learningFit?.fitStatus,
                    contentType: "collection",
                  }}
                />

                <div className="space-y-3 border-t border-border/30 pt-4 text-sm">
                  {courseInclusions.map((item) => (
                    <Item
                      key={item}
                      variant="default"
                      size="xs"
                      className="border-0 p-0 text-muted-foreground"
                    >
                      <ItemMedia variant="icon">
                        <ShieldCheck className="size-4 text-primary" />
                      </ItemMedia>
                      <ItemTitle className="text-sm font-medium text-muted-foreground">
                        {item}
                      </ItemTitle>
                    </Item>
                  ))}
                </div>
              </CardContent>

              <div className="border-t border-border/20 bg-muted/50 p-4 text-center text-xs font-medium text-muted-foreground">
                30-day Money-Back Guarantee
              </div>
            </Card>

            <Card className="rounded-2xl border border-border/20 bg-muted/40 p-6">
              <h3 className="mb-4 font-bold text-foreground">
                What&apos;s included
              </h3>
              <div className="space-y-4">
                <Item variant="default" size="sm" className="border-0 p-0">
                  <ItemMedia variant="icon">
                    <PlayCircle className="size-5 text-primary" />
                  </ItemMedia>
                  <ItemTitle className="text-sm text-muted-foreground">
                    {collection._count.tutorials} tutorial videos
                  </ItemTitle>
                </Item>
                <Item variant="default" size="sm" className="border-0 p-0">
                  <ItemMedia variant="icon">
                    <Download className="size-5 text-primary" />
                  </ItemMedia>
                  <ItemTitle className="text-sm text-muted-foreground">
                    {collection._count.resources} downloadable resources
                  </ItemTitle>
                </Item>
                <Item variant="default" size="sm" className="border-0 p-0">
                  <ItemMedia variant="icon">
                    <Users className="size-5 text-primary" />
                  </ItemMedia>
                  <ItemTitle className="text-sm text-muted-foreground">
                    Access on mobile and web
                  </ItemTitle>
                </Item>
                <Item variant="default" size="sm" className="border-0 p-0">
                  <ItemMedia>
                    <GraduationCap className="size-5 text-primary" />
                  </ItemMedia>
                  <ItemTitle className="text-sm text-muted-foreground">
                    Certificate of completion
                  </ItemTitle>
                </Item>
                <Item variant="default" size="sm" className="border-0 p-0">
                  <ItemMedia variant="icon">
                    <Clock3 className="size-5 text-primary" />
                  </ItemMedia>
                  <ItemTitle className="text-sm text-muted-foreground">
                    Lifetime access to updates
                  </ItemTitle>
                </Item>
              </div>
            </Card>

            <Alert className="rounded-2xl border-border/20 bg-primary/10 p-6 shadow-sm">
              <ShieldCheck className="size-5 text-secondary" />
              <AlertTitle className="text-sm font-bold text-foreground">
                Verified Learning Path
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                This collection has been reviewed by the Unibuddy academic team
                for structure, clarity, and learning value.
              </AlertDescription>
              <div className="col-start-2 mt-3">
                <Button
                  asChild
                  variant="ghost"
                  className="h-auto p-0 font-bold text-primary hover:bg-transparent"
                >
                  <Link href="/explore/tutorials">
                    <Item
                      variant="default"
                      size="xs"
                      className="w-auto border-0 p-0 text-primary"
                    >
                      <ItemTitle className="text-sm font-bold text-primary">
                        View all tutorials
                      </ItemTitle>
                      <ItemMedia variant="icon">
                        <ArrowRight className="size-4" />
                      </ItemMedia>
                    </Item>
                  </Link>
                </Button>
              </div>
            </Alert>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MetaChip>Ngành: {collection.majorId}</MetaChip>
        <MetaChip>Môn học: {collection.courseId}</MetaChip>
        <MetaChip>{collection.type}</MetaChip>
        <MetaChip>{collection.status}</MetaChip>
      </div>
    </section>
  )
}
