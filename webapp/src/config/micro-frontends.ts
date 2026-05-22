import type { ComponentType } from "react"

export type MicroFrontendMountMode = "route-segment" | "package" | "remote"

export type MicroFrontendStatus = "live" | "candidate" | "planned"

export interface MicroFrontendRoute {
  path: string
  owner: string
  description: string
}

export interface MicroFrontendContract {
  auth: "public" | "required" | "optional"
  dataAccess: "server-actions" | "api-gateway" | "static-content"
  stateScope: "local" | "feature-store" | "shared-shell"
  requiredProviders: string[]
}

export interface MicroFrontendDefinition {
  id: string
  name: string
  status: MicroFrontendStatus
  mountMode: MicroFrontendMountMode
  owner: string
  sourceRoot: string
  routes: MicroFrontendRoute[]
  contract: MicroFrontendContract
  sharedCapabilities: string[]
  rolloutNotes: string[]
  entry?: ComponentType
}

export const microFrontendRuntime = {
  host: "vercel",
  mode: process.env.NEXT_PUBLIC_MICRO_FRONTEND_MODE ?? "single-project",
  registryPath:
    process.env.NEXT_PUBLIC_MICRO_FRONTEND_REGISTRY_PATH ?? "/api/micro-frontends",
} as const

export const microFrontends = [
  {
    id: "intro",
    name: "Public Intro Experience",
    status: "live",
    mountMode: "route-segment",
    owner: "Growth Web",
    sourceRoot: "webapp/src/features/intro",
    routes: [
      {
        path: "/",
        owner: "Growth Web",
        description: "Landing page, marketing proof, and public navigation.",
      },
      {
        path: "/about",
        owner: "Growth Web",
        description: "Public product and company context.",
      },
      {
        path: "/pricing",
        owner: "Growth Web",
        description: "Plan comparison and conversion surface.",
      },
      {
        path: "/faq",
        owner: "Growth Web",
        description: "Frequently asked questions.",
      },
      {
        path: "/contact",
        owner: "Growth Web",
        description: "Public contact form and support links.",
      },
      {
        path: "/how-it-works",
        owner: "Growth Web",
        description: "Product walkthrough and feature explanation.",
      },
    ],
    contract: {
      auth: "public",
      dataAccess: "static-content",
      stateScope: "local",
      requiredProviders: ["ThemeProvider", "TooltipProvider"],
    },
    sharedCapabilities: ["SEO metadata", "public navigation", "theme tokens"],
    rolloutNotes: [
      "Keep as App Router route segments until independent deployment is required.",
      "Do not couple public page copy to private dashboard stores.",
    ],
  },
  {
    id: "auth",
    name: "Authentication",
    status: "live",
    mountMode: "route-segment",
    owner: "Identity Web",
    sourceRoot: "webapp/src/features/auth",
    routes: [
      {
        path: "/login",
        owner: "Identity Web",
        description: "Credential and OAuth sign-in flow.",
      },
      {
        path: "/sign-up",
        owner: "Identity Web",
        description: "Account registration flow.",
      },
      {
        path: "/otp",
        owner: "Identity Web",
        description: "One-time verification flow.",
      },
      {
        path: "/onboarding",
        owner: "Identity Web",
        description: "Post-registration profile setup and role selection.",
      },
    ],
    contract: {
      auth: "optional",
      dataAccess: "api-gateway",
      stateScope: "feature-store",
      requiredProviders: ["ReduxProvider", "ErrorProvider", "ThemeProvider"],
    },
    sharedCapabilities: ["session bootstrap", "form validation", "toast errors"],
    rolloutNotes: [
      "Auth owns redirects and token exchange behavior.",
      "Only export typed session results to other slices.",
    ],
  },
  {
    id: "learning",
    name: "Learning Workspace",
    status: "candidate",
    mountMode: "package",
    owner: "Learning Web",
    sourceRoot: "webapp/src/features/content",
    routes: [
      {
        path: "/home",
        owner: "Learning Web",
        description: "Personalized learning feed.",
      },
      {
        path: "/explore",
        owner: "Learning Web",
        description: "Resource, tutorial, and collection discovery.",
      },
      {
        path: "/library",
        owner: "Learning Web",
        description: "Owned and enrolled content.",
      },
    ],
    contract: {
      auth: "required",
      dataAccess: "api-gateway",
      stateScope: "feature-store",
      requiredProviders: ["ReduxProvider", "AppInitializer", "ErrorProvider"],
    },
    sharedCapabilities: [
      "content cards",
      "upload progress surface",
      "recommendation sections",
    ],
    rolloutNotes: [
      "Extract reusable cards into a shared UI package before remote deployment.",
      "Keep recommendation and content API calls behind typed service functions.",
    ],
  },
  {
    id: "creator-dashboard",
    name: "Creator And Admin Dashboard",
    status: "candidate",
    mountMode: "package",
    owner: "Creator Web",
    sourceRoot: "webapp/src/features/dashboard",
    routes: [
      {
        path: "/dashboard",
        owner: "Creator Web",
        description: "Dashboard index and dynamic slug pages.",
      },
      {
        path: "/dashboard/majors",
        owner: "Creator Web",
        description: "Major metadata management.",
      },
      {
        path: "/dashboard/tutorials",
        owner: "Creator Web",
        description: "Creator tutorial management.",
      },
      {
        path: "/dashboard/resources",
        owner: "Creator Web",
        description: "Creator resource management.",
      },
    ],
    contract: {
      auth: "required",
      dataAccess: "api-gateway",
      stateScope: "feature-store",
      requiredProviders: ["SidebarProvider", "ReduxProvider", "ErrorProvider"],
    },
    sharedCapabilities: ["dashboard shell", "metadata tables", "content modals"],
    rolloutNotes: [
      "Keep dashboard navigation in the host shell so child slices cannot fork IA.",
      "Promote route slugs into this registry before adding more dashboard pages.",
    ],
  },
  {
    id: "billing",
    name: "Wallet And Billing",
    status: "candidate",
    mountMode: "package",
    owner: "Commerce Web",
    sourceRoot: "webapp/src/features/billing",
    routes: [
      {
        path: "/settings/billing",
        owner: "Commerce Web",
        description: "Wallet, top-up, withdrawal, and subscription controls.",
      },
    ],
    contract: {
      auth: "required",
      dataAccess: "api-gateway",
      stateScope: "feature-store",
      requiredProviders: ["ReduxProvider", "ErrorProvider", "ThemeProvider"],
    },
    sharedCapabilities: ["currency formatting", "transaction timeline", "dialogs"],
    rolloutNotes: [
      "Billing can move remote last because it depends on guarded server session behavior.",
      "All money actions must stay behind server-side API gateway calls.",
    ],
  },
  {
    id: "assistant",
    name: "AI Study Assistant",
    status: "candidate",
    mountMode: "package",
    owner: "AI Experience Web",
    sourceRoot: "webapp/src/features/rag",
    routes: [
      {
        path: "/ask",
        owner: "AI Experience Web",
        description: "RAG chat workspace backed by recommendation and rag services.",
      },
    ],
    contract: {
      auth: "required",
      dataAccess: "api-gateway",
      stateScope: "local",
      requiredProviders: ["ReduxProvider", "ErrorProvider", "ThemeProvider"],
    },
    sharedCapabilities: ["markdown streaming", "citation rendering", "chat telemetry"],
    rolloutNotes: [
      "Single-project Vercel rollout keeps this as a package boundary before remote deployment.",
      "Keep stream transport isolated from the global Redux store.",
    ],
  },
  {
    id: "profile",
    name: "User Profile",
    status: "live",
    mountMode: "route-segment",
    owner: "Identity Web",
    sourceRoot: "webapp/src/features/user",
    routes: [
      {
        path: "/profile",
        owner: "Identity Web",
        description: "Authenticated user profile and public profile view.",
      },
    ],
    contract: {
      auth: "required",
      dataAccess: "api-gateway",
      stateScope: "feature-store",
      requiredProviders: ["ReduxProvider", "ErrorProvider", "ThemeProvider"],
    },
    sharedCapabilities: ["avatar upload", "profile cards", "activity feed"],
    rolloutNotes: [
      "Profile owns user-facing identity display; auth owns session lifecycle.",
      "Public profile view (/profile/[id]) must degrade gracefully for logged-out visitors.",
    ],
  },
  {
    id: "settings",
    name: "Account Settings",
    status: "live",
    mountMode: "route-segment",
    owner: "Identity Web",
    sourceRoot: "webapp/src/features/settings",
    routes: [
      {
        path: "/settings",
        owner: "Identity Web",
        description: "Account preferences, notification controls, and security settings.",
      },
    ],
    contract: {
      auth: "required",
      dataAccess: "api-gateway",
      stateScope: "feature-store",
      requiredProviders: ["ReduxProvider", "ErrorProvider", "ThemeProvider"],
    },
    sharedCapabilities: ["preference forms", "notification toggles"],
    rolloutNotes: [
      "Settings index owns general account preferences; billing sub-route is a separate MFE.",
      "Keep /settings/billing routing delegated to the billing MFE via startsWith matching.",
    ],
  },
] satisfies MicroFrontendDefinition[]

export type MicroFrontendId = (typeof microFrontends)[number]["id"]

export function getMicroFrontendById(id: MicroFrontendId) {
  return microFrontends.find((microFrontend) => microFrontend.id === id)
}

export function getMicroFrontendByPath(pathname: string) {
  return microFrontends.find((microFrontend) =>
    microFrontend.routes.some((route) => {
      if (route.path === "/") {
        return pathname === route.path
      }

      return pathname === route.path || pathname.startsWith(`${route.path}/`)
    })
  )
}
