import type { CollectionCardData } from "@/components/molecules/collection-card"
import type { ProfileItem } from "@/components/molecules/profile-card"
import type { ResourceCardData } from "@/components/molecules/resource-card"
import type { TutorialCardData } from "@/components/molecules/tutorial-card"
import type { LibraryAsset } from "@/features/library/components/library-asset-card"
import { LibraryAssetKind } from "@/features/library/components/library-asset-card"

import type {
  CollectionQueryItem,
  ResourceQueryItem,
  TutorialQueryItem,
} from "./types"

// ── Card Mappers (ResourceCard / TutorialCard / CollectionCard) ──

const vndFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
})

const compactFormat = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

type ViewCountSource = {
  totalViews?: number
  viewCount?: number
  views?: number
}

function formatViews(item: ViewCountSource) {
  return compactFormat.format(item.totalViews ?? item.viewCount ?? item.views ?? 0)
}

function formatPrice(price: number) {
  return price === 0 ? "Free" : vndFormat.format(price)
}

function applyDiscount(price: number, discount: number) {
  const safeDiscount = Math.min(Math.max(discount || 0, 0), 100)
  return Math.max(0, Math.round(price * (1 - safeDiscount / 100)))
}

function formatDiscountLabel(discount: number) {
  return discount > 0 ? `${discount}% OFF` : undefined
}

function initialStats(
  item: ViewCountSource,
  purchaseCount = 0,
  likeCount = 0
) {
  return {
    viewCount: item.totalViews ?? item.viewCount ?? item.views ?? 0,
    likeCount,
    purchaseCount,
  }
}

export function mapResourceToCard(
  item: ResourceQueryItem
): ResourceCardData {
  return {
    id: item.id,
    category: item.hightlights?.[0] ?? "Resource",
    title: item.title,
    rating: "—",
    reviews: String(item._count?.resourceOrders ?? 0),
    price: formatPrice(item.price),
    pricing: {
      originalPrice: formatPrice(item.price),
    },
    views: formatViews(item),
    href: `/explore/resources/${item.slug}`,
    interactionType: "RESOURCE",
    initialStats: initialStats(item, item._count?.resourceOrders ?? 0),
    purchaseType: "RESOURCE",
    thumbnailUrl: item.thumbnailUrl,
    bestseller: (item._count?.resourceOrders ?? 0) > 100,
    author: item.uploader
      ? { name: item.uploader.nickname, avatar: item.uploader.avatarUrl }
      : undefined,
  }
}

export function mapTutorialToCard(
  item: TutorialQueryItem
): TutorialCardData {
  const lessonCount = item._count?.tutorialMedia ?? 1
  return {
    id: item.id,
    category: item.hightlights?.[0] ?? "Tutorial",
    title: item.title,
    duration: `${lessonCount} lesson${lessonCount > 1 ? "s" : ""}`,
    level: "—",
    rating: "—",
    reviews: String(item._count?.tutorialOrders ?? 0),
    price: formatPrice(item.price),
    pricing: {
      originalPrice: formatPrice(item.price),
      discountLabel: formatDiscountLabel(item.discountBundle),
      finalPrice:
        item.discountBundle > 0
          ? formatPrice(applyDiscount(item.price, item.discountBundle))
          : undefined,
    },
    views: formatViews(item),
    discount: formatDiscountLabel(item.discountBundle),
    href: `/explore/tutorials/${item.slug}`,
    interactionType: "TUTORIAL",
    initialStats: initialStats(item, item._count?.tutorialOrders ?? 0),
    purchaseType: "TUTORIAL_BUNDLE",
    thumbnailUrl: item.thumbnailUrl,
    author: item.uploader
      ? { name: item.uploader.nickname, avatar: item.uploader.avatarUrl }
      : undefined,
  }
}

export function mapCollectionToCard(
  item: CollectionQueryItem,
  type: "resource" | "tutorial"
): CollectionCardData {
  const isResource = type === "resource"
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    count: isResource
      ? `${item._count?.resources ?? 0} Resources`
      : `${item._count?.tutorials ?? 0} Lessons`,
    rating: "—",
    reviews: "—",
    price: formatPrice(item.originalPrice ?? 0),
    pricing: {
      originalPrice: formatPrice(item.originalPrice ?? 0),
      discountLabel: formatDiscountLabel(item.discount),
      finalPrice:
        item.discount > 0
          ? formatPrice(item.discountedPrice ?? applyDiscount(item.originalPrice ?? 0, item.discount))
          : undefined,
    },
    views: formatViews(item),
    discount: formatDiscountLabel(item.discount),
    href: isResource
      ? `/explore/resources/collections/${item.slug}`
      : `/explore/tutorials/collections/${item.slug}`,
    interactionType: isResource ? "RESOURCE_COLLECTION" : "TUTORIAL_COLLECTION",
    initialStats: initialStats(item),
    purchaseType: isResource
      ? "RESOURCE_COLLECTION"
      : "TUTORIAL_BUNDLE_COLLECTION",
    thumbnailUrl: item.thumbnailUrl,
    author: item.uploader
      ? { name: item.uploader.nickname, avatar: item.uploader.avatarUrl }
      : undefined,
  }
}

// ── ProfileItem Mappers (profile pages) ─────────────────────

export function mapTutorialToProfileItem(
  item: TutorialQueryItem
): ProfileItem {
  return {
    title: item.title || "Untitled",
    description: item.description || "No description provided.",
    price: item.price === 0 ? "Free" : `$${item.price ?? 0}`,
    rating: "5.0",
    reviews: "0",
    type: "Tutorial",
    badge: undefined,
    thumbnailUrl: item?.thumbnailUrl,
  }
}

export function mapResourceToProfileItem(
  item: ResourceQueryItem
): ProfileItem {
  return {
    title: item.title || "Untitled",
    description: item.summary || "No description provided.",
    price: item.price === 0 ? "Free" : `$${item.price ?? 0}`,
    rating: "5.0",
    reviews: "0",
    type: "Resource",
    badge: undefined,
    thumbnailUrl: item?.thumbnailUrl,
  }
}

export function mapTutorialCollectionToProfileItem(
  item: CollectionQueryItem
): ProfileItem {
  return {
    title: item.title || "Untitled",
    description: item.description || "No description provided.",
    price: item.discount === 100 ? "Free" : "—",
    rating: "5.0",
    reviews: "0",
    type: `Tutorial Series (${item._count?.tutorials ?? 0} items)`,
    badge: item.discount ? `${item.discount}% OFF` : undefined,
    thumbnailUrl: item?.thumbnailUrl,
  }
}

export function mapResourceCollectionToProfileItem(
  item: CollectionQueryItem
): ProfileItem {
  return {
    title: item.title || "Untitled",
    description: item.description || "No description provided.",
    price: item.discount === 100 ? "Free" : "—",
    rating: "5.0",
    reviews: "0",
    type: `Resource Series (${item._count?.resources ?? 0} items)`,
    badge: item.discount ? `${item.discount}% OFF` : undefined,
    thumbnailUrl: item?.thumbnailUrl,
  }
}

// ── LibraryAsset Mappers (library page) ─────────────────────

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4"

export function mapResourceToLibraryAsset(
  item: ResourceQueryItem
): LibraryAsset {
  return {
    slug: item.slug,
    title: item.title,
    description: item.summary || "No description",
    author: item.uploader?.nickname || item.userId,
    authorAvatar: item.uploader?.avatarUrl,
    image: item?.thumbnailUrl || PLACEHOLDER_IMAGE,
    kind: LibraryAssetKind.Components,
    sourcePath: "",
  }
}

export function mapTutorialToLibraryAsset(
  item: TutorialQueryItem
): LibraryAsset {
  return {
    slug: item.slug,
    title: item.title,
    description: item.description || "No description",
    author: item.uploader?.nickname || item.userId,
    authorAvatar: item.uploader?.avatarUrl,
    image: item?.thumbnailUrl || PLACEHOLDER_IMAGE,
    kind: LibraryAssetKind.Tutorial,
    sourcePath: "",
  }
}

// ── Library Collection Mapper ───────────────────────────────

export function mapCollectionToLibraryCard(
  item: CollectionQueryItem,
  type: "resource" | "tutorial"
): CollectionCardData {
  const isResource = type === "resource"
  const itemCount = isResource
    ? (item._count?.resources ?? 0)
    : (item._count?.tutorials ?? 0)

  return {
    id: item.id,
    title: item.title,
    description: item.description || "No description",
    count: `${itemCount} ${isResource ? "Files" : "Lessons"}`,
    rating: "5.0",
    reviews: "0",
    price: formatPrice(item.originalPrice ?? 0),
    pricing: {
      originalPrice: formatPrice(item.originalPrice ?? 0),
      discountLabel: formatDiscountLabel(item.discount),
      finalPrice:
        item.discount > 0
          ? formatPrice(item.discountedPrice ?? applyDiscount(item.originalPrice ?? 0, item.discount))
          : undefined,
    },
    discount: formatDiscountLabel(item.discount),
    href: isResource
      ? `/library/resources/collections/${item.slug}`
      : `/library/tutorials/collections/${item.slug}`,
    thumbnailUrl: item?.thumbnailUrl || PLACEHOLDER_IMAGE,
    author: item.uploader
      ? { name: item.uploader.nickname, avatar: item.uploader.avatarUrl }
      : undefined,
  }
}
