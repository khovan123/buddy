import type { ReactNode } from "react"

import type { Metadata } from "next"

import { Geist, Geist_Mono } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "../bones/registry"
import "./globals.css"

import { ThemeProvider } from "../components/theme-provider"
import { AppInitializer } from "../lib/redux/app-initializer"
import { ReduxProvider } from "../lib/redux/redux-provider"
import { cn } from "../lib/utils"
import { ErrorProvider } from "../providers/error-provider"
import { NextAuthSessionProvider } from "../providers/next-auth-session-provider"
import { SessionLoginDialogProvider } from "../providers/session-login-dialog-provider"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

function getMetadataBase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://unibuddy.app")
  } catch {
    return new URL("https://unibuddy.app")
  }
}

function getSiteUrl() {
  return getMetadataBase().toString().replace(/\/$/, "")
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "Buddy",
  title: {
    default: "Buddy | Learn, Share, Grow",
    template: "%s | Buddy",
  },
  description:
    "Buddy connects students and creators through curated resources, tutorials, and collaborative learning paths.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Buddy",
    title: "Buddy | Learn, Share, Grow",
    description:
      "Explore curated learning resources, tutorials, and creator-led collections on Buddy.",
    url: "/",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Buddy — Education Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buddy | Learn, Share, Grow",
    description:
      "Explore curated learning resources, tutorials, and creator-led collections on Buddy.",
    images: ["/og-default.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const siteUrl = getSiteUrl()
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Buddy",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      "Buddy connects students and creators through curated resources, tutorials, and collaborative learning paths.",
    foundingDate: "2026",
    founder: {
      "@type": "Person",
      name: "Minh Phan",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${siteUrl}/contact`,
    },
    sameAs: [
      // TODO: Add real social media profile URLs for AI entity recognition
      // "https://twitter.com/buddyedu",
      // "https://www.linkedin.com/company/buddyedu",
      // "https://www.youtube.com/@buddyedu",
      // "https://www.facebook.com/buddyedu",
    ],
  }
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Buddy",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/explore?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          // react-doctor-ignore
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          // react-doctor-ignore
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
        <ReduxProvider>
          <AppInitializer>
            {/* <SocketProvider> */}
            <ThemeProvider>
              <TooltipProvider>
                <ErrorProvider>
                  {/* <MotionProvider> */}
                  <NextAuthSessionProvider>
                    <SessionLoginDialogProvider>
                      <div className="relative flex min-h-screen flex-col">
                        <Toaster />
                        {children}
                      </div>
                    </SessionLoginDialogProvider>
                  </NextAuthSessionProvider>
                  {/* </MotionProvider> */}
                </ErrorProvider>
              </TooltipProvider>
            </ThemeProvider>
            {/* </SocketProvider> */}
          </AppInitializer>
        </ReduxProvider>
      </body>
    </html>
  )
}
