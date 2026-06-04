import { NextRequest, NextResponse } from "next/server"

import { getToken } from "next-auth/jwt"

import {
  buildRoleAccessInput,
  isAdminAccess,
} from "@/lib/auth/role-access"

const PRIVATE_ROUTES = [
  "/profile",
  "/library",
  "/settings",
  "/onboarding",
  "/dashboard",
  "/home/collections/create",
  "/home/resources/create",
  "/home/tutorials/create",
]

const ADMIN_ROUTES = ["/dashboard"]

const AUTH_ROUTES = [
  "/login",
  "/sign-up",
  "/otp",
  "/recovery-token",
  "/reset-password",
]

const INTRO_PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/faq",
  "/how-it-works",
  "/pricing",
]

export default async function proxy(req: NextRequest) {
  const token =
    (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: req.nextUrl.protocol === "https:",
    })) ||
    (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "__Secure-next-auth.session-token",
    })) ||
    (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "next-auth.session-token",
    }))

  const { pathname, search } = req.nextUrl

  const isPrivateRoute = PRIVATE_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isIntroPublicRoute = INTRO_PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  )
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route))

  if (pathname === "/") {
    return NextResponse.next()
  }

  const roleAccess = buildRoleAccessInput(token?.user, token?.accessToken)
  const isAdmin = isAdminAccess(roleAccess)

  // Prevent logged-in users from accessing auth pages (login, register...)
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL(isAdmin ? "/dashboard" : "/home", req.url))
  }

  // Block unauthenticated users from accessing private routes
  if (isPrivateRoute && !token) {
    const encodedCallbackUrl = encodeURIComponent(`${pathname}${search}`)
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodedCallbackUrl}`, req.url)
    )
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/home", req.url))
  }

  if (isAdmin && !isAdminRoute && !isIntroPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Allow all other routes (public or authenticated private routes)
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/.well-known/vercel/microfrontends/:path*",
  ],
}
