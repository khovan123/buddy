"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

import { usePathname, useRouter } from "next/navigation"

import { getSession, signIn } from "next-auth/react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas"
import { setToken } from "@/features/auth/store/auth-slice"
import { OtpPurpose } from "@/features/auth/type"
import { baseApi, SESSION_LOGIN_REQUIRED_EVENT } from "@/lib/redux/base-api"
import type { AppDispatch } from "@/lib/redux/store"
import { useGlobalError } from "@/providers/error-provider"

const DISABLED_EXACT_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/faq",
  "/how-it-works",
  "/pricing",
  "/login",
  "/sign-up",
  "/otp",
  "/onboarding",
])

function isDisabledPath(pathname: string) {
  return (
    DISABLED_EXACT_PATHS.has(pathname) ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/sign-up/") ||
    pathname.startsWith("/otp/") ||
    pathname.startsWith("/onboarding/")
  )
}

export function SessionLoginDialogProvider({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch<AppDispatch>()
  const { handleError, clearError } = useGlobalError()
  const [open, setOpen] = useState(false)

  const disabled = useMemo(() => isDisabledPath(pathname), [pathname])

  useEffect(() => {
    const handleSessionLoginRequired = () => {
      if (!isDisabledPath(globalThis.location.pathname)) {
        clearError()
        setOpen(true)
      }
    }

    globalThis.addEventListener(
      SESSION_LOGIN_REQUIRED_EVENT,
      handleSessionLoginRequired
    )

    return () => {
      globalThis.removeEventListener(
        SESSION_LOGIN_REQUIRED_EVENT,
        handleSessionLoginRequired
      )
    }
  }, [clearError])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data: LoginFormValues) => {
    clearError()

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes("[REQUIRES_VERIFICATION]")) {
          router.push(
            `/otp?email=${encodeURIComponent(data.email)}&purpose=${OtpPurpose.EMAIL_VERIFICATION}`
          )
          return
        }

        handleError(result.error)
        return
      }

      if (result?.ok) {
        const session = await getSession()
        if (session?.accessToken) {
          dispatch(setToken(session.accessToken))
        }

        dispatch(baseApi.util.resetApiState())
        setOpen(false)
        reset({ email: "", password: "" })
        router.refresh()
      }
    } catch (error: unknown) {
      handleError(error)
    }
  }

  return (
    <>
      {children}
      <Dialog open={!disabled && open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log in to continue</DialogTitle>
            <DialogDescription>
              Your session expired. Log in again to continue from this page.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <FieldSet className="gap-4">
                <Field>
                  <FieldLabel htmlFor="session-login-email">Email</FieldLabel>
                  <Input
                    id="session-login-email"
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    {...register("email")}
                  />
                  {errors.email ? (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor="session-login-password">
                    Password
                  </FieldLabel>
                  <Input
                    id="session-login-password"
                    type="password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    {...register("password")}
                  />
                  {errors.password ? (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  ) : null}
                </Field>
              </FieldSet>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
