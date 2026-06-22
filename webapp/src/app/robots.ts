import type { MetadataRoute } from "next"

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/home",
          "/explore",
          "/about",
          "/contact",
          "/pricing",
          "/faq",
          "/how-it-works",
        ],
        disallow: [
          "/api/",
          "/library",
          "/profile",
          "/dashboard",
          "/login",
          "/sign-up",
          "/otp",
          "/onboarding",
          "/bones-fixture",
        ],
      },
      // AI search crawlers — explicit allow for citation eligibility
      {
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/api/", "/library", "/profile", "/dashboard"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: ["/api/", "/library", "/profile", "/dashboard"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/"],
        disallow: ["/api/", "/library", "/profile", "/dashboard"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/"],
        disallow: ["/api/", "/library", "/profile", "/dashboard"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/"],
        disallow: ["/api/", "/library", "/profile", "/dashboard"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/"],
        disallow: ["/api/", "/library", "/profile", "/dashboard"],
      },
      // Block training-only crawlers (not used for search citations)
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
