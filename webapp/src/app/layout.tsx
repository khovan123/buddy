import type { ReactNode } from "react"

import type { Metadata } from "next"

import { Geist, Geist_Mono } from "next/font/google"

import { Analytics } from "@vercel/analytics/next"

import { MicrosoftClarity } from "@/components/analytics/microsoft-clarity"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "../bones/registry"
import "./globals.css"

import { ThemeProvider } from "../components/theme-provider"
import { LanguageProvider } from "../i18n/language-provider"
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
    return new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://platform-buddy.vercel.app"
    )
  } catch {
    return new URL("https://platform-buddy.vercel.app")
  }
}

function getSiteUrl() {
  return getMetadataBase().toString().replace(/\/$/, "")
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "Buddy",
  title: {
    default: "Buddy | Học tập, chia sẻ, phát triển",
    template: "%s | Buddy",
  },
  description:
    "Buddy kết nối người học và nhà sáng tạo qua tài liệu, bài học và lộ trình học tập được chọn lọc.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Buddy",
    title: "Buddy | Học tập, chia sẻ, phát triển",
    description:
      "Khám phá tài liệu, bài học và bộ sưu tập do creator xây dựng trên Buddy.",
    url: "/",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Buddy - Nền tảng học tập",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buddy | Học tập, chia sẻ, phát triển",
    description:
      "Khám phá tài liệu, bài học và bộ sưu tập do creator xây dựng trên Buddy.",
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
      "Buddy kết nối người học và nhà sáng tạo qua tài liệu, bài học và lộ trình học tập được chọn lọc.",
    foundingDate: "2026",
    founder: {
      "@type": "Person",
      name: "Minh Phan",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "hỗ trợ khách hàng",
      url: `${siteUrl}/contact`,
    },
    sameAs: [
      // TODO: Thêm URL mạng xã hội thật để hệ thống nhận diện thực thể tốt hơn
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
      lang="vi"
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
                    <LanguageProvider>
                      <SessionLoginDialogProvider>
                        <div className="relative flex min-h-screen flex-col">
                          <Toaster />
                          {children}
                        </div>
                      </SessionLoginDialogProvider>
                    </LanguageProvider>
                  </NextAuthSessionProvider>
                  {/* </MotionProvider> */}
                </ErrorProvider>
              </TooltipProvider>
            </ThemeProvider>
            {/* </SocketProvider> */}
          </AppInitializer>
        </ReduxProvider>
        <MicrosoftClarity />
        <Analytics />
      </body>
    </html>
  )
}
