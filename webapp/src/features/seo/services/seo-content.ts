type SeoContent = {
  title: string
  description: string
  badge: string
}

const SEO_FALLBACK: Record<string, SeoContent> = {
  explore: {
    title: "Explore Top Trending Collections",
    description:
      "Browse top trending collections, resources, and tutorials on Buddy. Discover the best educational content curated for learners and educators.",
    badge: "Explore",
  },
  "explore-resources": {
    title: "Explore Resources",
    description:
      "Find a wide range of educational resources including documents, guides, and study materials. All formats supported: docx, pdf, pptx, md.",
    badge: "Resources",
  },
  "explore-resources-collections": {
    title: "Resource Collections",
    description:
      "Browse curated collections of educational resources. Each collection offers valuable materials for your learning journey.",
    badge: "Resource Collections",
  },
  "explore-tutorials": {
    title: "Explore Tutorials",
    description:
      "Access a variety of tutorials with teaching videos and attached documents. Enhance your skills with expert-led content.",
    badge: "Tutorials",
  },
  "explore-tutorials-collections": {
    title: "Tutorial Collections",
    description:
      "Discover collections of tutorials, each featuring multiple videos and supporting resources for comprehensive learning.",
    badge: "Tutorial Collections",
  },
  "explore-resources-collection-:id": {
    title: "Resource Collection Details",
    description:
      "View detailed information, price, and included documents for this resource collection. All materials are available in docx, pdf, pptx, or md format.",
    badge: "Resource Collection",
  },
  "explore-resources-:id": {
    title: "Resource Details",
    description:
      "See price, content, and all documents included in this resource. Download in your preferred format: docx, pdf, pptx, md.",
    badge: "Resource",
  },
  "explore-tutorials-collection-:id": {
    title: "Tutorial Collection Details",
    description:
      "Detailed view of this tutorial collection: price, content, videos for each tutorial, and attached resources with supporting documents.",
    badge: "Tutorial Collection",
  },
  "explore-tutorials-:id": {
    title: "Tutorial Details",
    description:
      "View tutorial details: price, content, teaching video, and attached resources with downloadable documents.",
    badge: "Tutorial",
  },
  library: {
    title: "My Library",
    description:
      "Access all your purchased resources, tutorials, resource collections, and tutorial collections. Your assets remain available even if the owner deletes them.",
    badge: "Library",
  },
  "library-resources-:id": {
    title: "Resource Details | My Library",
    description:
      "View and download all documents in this resource directly on the web. Supported formats: docx, pdf, pptx, md.",
    badge: "Resource",
  },
  "library-resources-collections-:id": {
    title: "Resource Collection Details | My Library",
    description:
      "Browse your purchased resource collection as a list of resources. View and download each document easily.",
    badge: "Resource Collection",
  },
  "library-tutorials-:id": {
    title: "Tutorial Details | My Library",
    description:
      "Watch your purchased tutorial video and access all attached resources. View or download supporting documents directly.",
    badge: "Tutorial",
  },
  "library-tutorials-collections-:id": {
    title: "Tutorial Collection Details | My Library",
    description:
      "Browse your purchased tutorial collection as a list of tutorials. Watch videos and access all attached resources for each tutorial.",
    badge: "Tutorial Collection",
  },
  home: {
    title: "Education Marketplace Platform",
    description:
      "Discover, buy, and sell educational materials, courses, and connect with education experts on Buddy. A place for everyone to learn and share knowledge.",
    badge: "Education Marketplace",
  },
  about: {
    title: "About",
    description:
      "Learn about Buddy — the student-led education marketplace connecting 100K+ learners with curated resources, tutorials, and expert-created collections. Our mission, team, and story.",
    badge: "About",
  },
  contact: {
    title: "Contact",
    description:
      "Get in touch with the Buddy team. Contact sales for demos and custom pricing, or submit a support ticket for help with your account.",
    badge: "Contact",
  },
  pricing: {
    title: "Pricing",
    description:
      "Compare Buddy Free and Pro plans for Creators and Students. Scale your storage, unlock unlimited content creation, and get premium support starting at $0/month.",
    badge: "Pricing",
  },
  faq: {
    title: "FAQ",
    description:
      "Frequently asked questions about Buddy's platform, subscriptions, creator tools, and student resources. Get answers to common questions.",
    badge: "FAQ",
  },
  "how-it-works": {
    title: "How It Works",
    description:
      "Learn how Buddy works — from signing up to exploring resources, purchasing tutorials, and building your own creator portfolio. A step-by-step guide.",
    badge: "How It Works",
  },
  "auth-sign-up": {
    title: "Register Account",
    description:
      "Create an account to start buying, selling materials, courses, and join a dynamic education community.",
    badge: "Sign Up",
  },
  "auth-login": {
    title: "Login to Buddy",
    description:
      "Access your library, courses, and manage your education transactions.",
    badge: "Login",
  },
  "auth-otp": {
    title: "OTP Verification",
    description:
      "Enter the OTP code to protect your account and continue using Buddy securely.",
    badge: "Security",
  },
  "auth-forgot-password": {
    title: "Reset Password",
    description:
      "Request a password reset link to recover access to your Buddy account.",
    badge: "Security",
  },
  "auth-reset-password": {
    title: "Set New Password",
    description:
      "Choose a new secure password for your Buddy account.",
    badge: "Security",
  },
  onboarding: {
    title: "Complete Your Profile",
    description:
      "Help us personalize your experience. Tell us about your major, career goal, and key skills.",
    badge: "Onboarding",
  },
  profile: {
    title: "Personal Profile",
    description:
      "Manage your personal information, listed materials, transactions, and learning history on the education marketplace.",
    badge: "Profile",
  },
  dashboard: {
    title: "Dashboard",
    description: "Manage metadata as Majors and Courses.",
    badge: "Dashboard",
  },
  "create-resource": {
    title: "Create Resource",
    description:
      "Upload study materials and attach them to courses. Supported formats: docx, pdf, pptx, md.",
    badge: "Create",
  },
  "create-tutorial": {
    title: "Create Tutorial",
    description:
      "Create a new tutorial course with video lessons and attach supporting resources for learners.",
    badge: "Create",
  },
  "create-collection": {
    title: "Create Collection",
    description:
      "Bundle resources and tutorials into a cohesive learning path with an optional discount.",
    badge: "Create",
  },
}

export async function getSeoContent(slug: string): Promise<SeoContent> {
  const fallback = SEO_FALLBACK[slug] ?? {
    title: `Buddy | ${slug}`,
    description: "Content is SEO-optimized and regenerated on an ISR cycle.",
    badge: "Discover",
  }

  // try {
  //   const res = await fetchApi(
  //     "GET",
  //     `/seo-content/${encodeURIComponent(slug)}`,
  //     undefined,
  //     undefined,
  //     false,
  //     { next: { revalidate: 300 } }
  //   )

  //   if (!res.ok) {
  //     return fallback
  //   }

  //   const payload = (await res.json()) as {
  //     data?: { title?: string; description?: string; badge?: string }
  //   }

  //   if (!payload.data) {
  //     return fallback
  //   }

  //   return {
  //     title: payload.data.title || fallback.title,
  //     description: payload.data.description || fallback.description,
  //     badge: payload.data.badge || fallback.badge,
  //   }
  // } catch {
  //   return fallback
  // }
  return fallback
}

export type { SeoContent }
