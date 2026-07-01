import type { Metadata } from "next"

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  CalendarDays,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  PencilLine,
  ShieldCheck,
  ShoppingCart,
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
  getResourceBySlug,
  getResourcePreview,
  ResourceDocumentPreview,
} from "@/features/content"
import {
  ItemInteractionControls,
  TrackContentView,
} from "@/features/interaction"
import { getServerTranslator } from "@/i18n/server"
import { getCachedSession } from "@/lib/server-session"

type PageParams = Promise<{ id: string }>

const vndFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
})

function formatPrice(price: number) {
  return price === 0 ? "free" : vndFormat.format(price)
}

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { id } = await params
  const { t } = await getServerTranslator()

  const resource = await getResourceBySlug(id)
  if (!resource) {
    return {
      title: t("explore.resource.notFoundTitle"),
      description: t("explore.resource.notFoundDescription"),
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
  const { locale, t } = await getServerTranslator()

  const [resource, previewData] = await Promise.all([
    getResourceBySlug(id),
    getResourcePreview(id).catch(() => null),
  ])
  if (!resource) {
    notFound()
  }

  const session = await getCachedSession()
  const isOwner = session?.user?.id === resource.userId
  const resourceTitle = resource.title

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"
  const canonical = `/explore/resources/${id}`

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: resourceTitle,
    description: resource.summary || "",
    url: `${siteUrl}${canonical}`,
    category: t("explore.resource.category"),
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
      { "@type": "ListItem", position: 1, name: t("nav.home"), item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: t("nav.explore"),
        item: `${siteUrl}/explore`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: t("content.resources"),
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
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {resourceTitle}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {resource.summary || t("common.noSummary")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          <ResourceDocumentPreview
            resourceId={id}
            thumbnailUrl={resource.thumbnailUrl}
            title={resourceTitle}
            sourceLabel={resource.major?.name || t("explore.resource.sourceLabel")}
            description={resource.summary || t("common.noSummary")}
            author={resource.uploader?.nickname || t("common.expertBuddy")}
            updatedAt={new Date(resource.updatedAt).toLocaleDateString(
              locale === "en" ? "en-US" : "vi-VN",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}
            pageCountHint={`${resource._count.resourceMeta || 1} ${t("explore.resource.pageHint")}`}
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
                  {resource._count.resourceOrders} {t("explore.resource.orders")}
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <ShoppingCart className="size-4 text-primary" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {resource._count.resourceOrders}+ {t("explore.resource.downloads")}
                </ItemTitle>
              </Item>
              <Item variant="default" size="xs" className="w-auto border-0 p-0">
                <ItemMedia variant="icon">
                  <CalendarDays className="size-4" />
                </ItemMedia>
                <ItemTitle className="text-sm font-medium text-muted-foreground">
                  {t("common.updated")}{" "}
                  {new Date(resource.updatedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
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
                  {resource.uploader?.nickname || t("common.expertBuddy")}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {resource.uploader?.career?.name || t("common.contentCreator")}
                </p>
              </div>
            </div>
            {isOwner ? (
              <Button asChild variant="outline" className="font-bold">
                <Link href="/content">{t("common.manage")}</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="font-bold text-primary hover:bg-primary/5"
              >
                {t("common.follow")}
              </Button>
            )}
          </div>

          <div className="space-y-6 text-muted-foreground">
            <h3 className="text-2xl font-bold text-foreground">
              {t("explore.resource.about")}
            </h3>
            <p className="text-lg leading-relaxed">
              {resource.summary || t("common.noSummary")}
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
                {t("explore.resource.fileDetails")}
              </h4>
              <p>
                {t("explore.resource.fileDetailsDescription")}
              </p>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <Card className="rounded-2xl border border-border/20 bg-card p-8 shadow-sm">
              <div className="mb-6">
                <CardPrice
                  price={formatPrice(resource.price || 0)}
                  pricing={{
                    originalPrice: formatPrice(resource.price || 0),
                  }}
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
                      <FileText className="size-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemTitle className="text-sm font-medium">
                      {t("explore.resource.format")}
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
                      {t("explore.resource.fileSize")}
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
                      {t("explore.resource.totalPages")}
                    </ItemTitle>
                  </Item>
                  <span className="font-bold">
                    {resource._count.resourceMeta} {t("explore.resource.documents")}
                  </span>
                </div>
              </div>

              {isOwner ? (
                <div className="space-y-3">
                  <Alert className="border-primary/30 bg-primary/8">
                    <ShieldCheck className="size-4 text-primary" />
                    <AlertDescription className="text-sm font-medium text-foreground">
                      {t("explore.resource.ownerAlert")}
                    </AlertDescription>
                  </Alert>
                  <div className="grid gap-2">
                    <Button asChild className="w-full text-base font-bold">
                      <Link href="/content">
                        <PencilLine className="size-4" />
                        {t("explore.resource.manageInContent")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/library/resources/${resource.slug}`}>
                        <Eye className="size-4" />
                        {t("explore.resource.openOwnerPreview")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <PurchaseButton
                    itemId={resource.id}
                    itemType="RESOURCE"
                    label={t("explore.resource.buy")}
                    freeLabel={t("explore.resource.get")}
                    className="mb-4 w-full text-base font-bold"
                    price={resource.price || 0}
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
                        {t("explore.resource.securePayment")}
                      </ItemTitle>
                    </Item>
                  </div>
                </>
              )}

              <CardContent className="mt-8 rounded-lg border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm leading-tight font-semibold text-foreground">
                  {t("explore.resource.browseSubject")}
                </p>
                <Link
                  href="/explore/resources/collections"
                  className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
                >
                  {t("explore.resource.viewCollections")}
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
                  {t("explore.resource.verifiedTitle")}
                </ItemTitle>
              </Item>
              <p className="text-xs text-muted-foreground">
                {t("explore.resource.verifiedDescription")}
              </p>
            </Card>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MetaChip>{t("common.major")}: {resource.major?.name ?? "#"}</MetaChip>
        <MetaChip>{t("common.course")}: {resource.course?.name ?? "#"}</MetaChip>
        <MetaChip>{t("common.semester")}: {resource.course?.semester ?? "#"}</MetaChip>
      </div>
    </section>
  )
}
