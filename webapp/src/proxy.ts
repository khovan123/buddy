import { NextRequest, NextResponse } from "next/server"

import { getToken } from "next-auth/jwt"

const PRIVATE_ROUTES = [
  "/profile",
  "/library",
  "/settings",
  "/onboarding",
  "/ask",
  "/dashboard",
  "/home/collections/create",
  "/home/resources/create",
  "/home/tutorials/create",
]

const AUTH_ROUTES = [
  "/login",
  "/sign-up",
  "/otp",
  "/recovery-token",
  "/reset-password",
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

  if (pathname === "/") {
    return NextResponse.next()
  }

  // Prevent logged-in users from accessing auth pages (login, register...)
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/home", req.url))
  }

  // Block unauthenticated users from accessing private routes
  if (isPrivateRoute && !token) {
    const encodedCallbackUrl = encodeURIComponent(`${pathname}${search}`)
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodedCallbackUrl}`, req.url)
    )
  }

  // Allow all other routes (public or authenticated private routes)
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|\\.well-known|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
