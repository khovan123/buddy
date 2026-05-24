"use client"

import { useEffect } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { getSession, signIn } from "next-auth/react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import { toast } from "sonner"

import { SectionHeading } from "@/components/atoms/section-heading"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas"
import { setToken } from "@/features/auth/store/auth-slice"
import { OtpPurpose } from "@/features/auth/type"
import { useGlobalError } from "@/providers/error-provider"

import { OAuthButtons } from "./oauth-buttons"

export function LoginForm() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { handleError, clearError } = useGlobalError()

  useEffect(() => {
    const url = new URL(globalThis.location.href)
    if (url.searchParams.get("sessionExpired") !== "1") {
      return
    }

    toast.error("Your session has expired. Please log in again.")
    url.searchParams.delete("sessionExpired")
    globalThis.history.replaceState(null, "", `${url.pathname}${url.search}`)
  }, [])

  const {
    register,
    handleSubmit,
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
      } else if (result?.ok) {
        const session = await getSession()
        if (session?.accessToken) {
          dispatch(setToken(session.accessToken))
        }

        router.push("/home")
        router.refresh()
      }
    } catch (err: unknown) {
      handleError(err)
    }
  }

  return (
    <section className="space-y-5 [&>header]:space-y-2 [&>header>h2]:text-3xl [&>header>p]:leading-6">
      <SectionHeading
        badge="Login"
        title="Login to Buddy"
        description="Return to your library, course workspace, and saved materials."
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          <FieldSet className="gap-4">
            <FieldLegend variant="label" className="sr-only">
              Login details
            </FieldLegend>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="student@university.edu"
                disabled={isSubmitting}
                className="h-11 border-border/55 bg-background/80 px-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--card)_86%,transparent)]"
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="********"
                disabled={isSubmitting}
                className="h-11 border-border/55 bg-background/80 px-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--card)_86%,transparent)]"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              ) : (
                <FieldDescription>
                  Use the password associated with your account.
                </FieldDescription>
              )}
            </Field>
          </FieldSet>
          <Field>
            <Button
              className="h-11 w-full shadow-[0_18px_34px_-22px_color-mix(in_oklch,var(--primary)_80%,transparent)]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Logging in…
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign up now
        </Link>
      </p>
      <OAuthButtons />
    </section>
  )
}
