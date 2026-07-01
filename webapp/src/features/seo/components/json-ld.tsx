import { DISPLAY_CURRENCY } from "@/features/billing/types/billing-types"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://buddy.app"
const SITE_NAME = "Buddy"

/**
 * Generate a BreadcrumbList JSON-LD object.
 * @param items — array of { name, path } representing the breadcrumb trail
 */
export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

/**
 * Generate a WebPage JSON-LD object with freshness signals.
 */
export function webPageJsonLd(params: {
  name: string
  description: string
  url: string
  type?: string
  dateModified?: string
}): object {
  return {
    "@context": "https://schema.org",
    "@type": params.type ?? "WebPage",
    name: params.name,
    description: params.description,
    url: `${SITE_URL}${params.url}`,
    dateModified: params.dateModified ?? new Date().toISOString(),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  }
}

/**
 * Generate a FAQPage JSON-LD object for AI-extractable Q&A pairs.
 * High-impact: +30-40% visibility boost on Perplexity, helps all platforms.
 */
export function faqPageJsonLd(
  items: Array<{ q: string; a: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  }
}

/**
 * Generate a HowTo JSON-LD object for step-by-step content.
 */
export function howToJsonLd(params: {
  name: string
  description: string
  steps: Array<{ name: string; text: string }>
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
    description: params.description,
    step: params.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  }
}

/**
 * Generate Product + Offer JSON-LD for pricing plans.
 * AI systems cite pages with transparent pricing significantly more.
 */
export function productWithOffersJsonLd(params: {
  name: string
  description: string
  url: string
  offers: Array<{
    name: string
    price: number
    priceCurrency?: string
    description: string
  }>
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: params.name,
    description: params.description,
    url: `${SITE_URL}${params.url}`,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: params.offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency ?? DISPLAY_CURRENCY,
      description: offer.description,
      availability: "https://schema.org/InStock",
    })),
  }
}

/**
 * Render a JSON-LD script tag for use in Server Components.
 */
export function JsonLdScript({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data]
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  )
}
