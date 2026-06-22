import type { MetadataRoute } from "next"

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://buddy.app"
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl()
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/home`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/explore/resources`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explore/resources/collections`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/explore/tutorials`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explore/tutorials/collections`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ]

  // TODO: When connected to a real API, fetch all resource/tutorial/collection IDs
  // and generate dynamic sitemap entries:
  //
  // const resources = await fetchAllResourceSlugs()
  // const dynamicPages = resources.map(slug => ({
  //   url: `${baseUrl}/explore/resources/${slug}`,
  //   lastModified: now,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.6,
  // }))

  return staticPages
}
