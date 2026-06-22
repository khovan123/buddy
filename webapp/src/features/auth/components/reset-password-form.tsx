"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { SectionHeading } from "@/components/atoms/section-heading"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/features/auth/schemas"
import { useResetPasswordMutation } from "@/features/auth/services/auth-api"
import { useGlobalError } from "@/providers/error-provider"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { handleError, clearError } = useGlobalError()
  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError("The password reset token is missing from the URL. Please request a new password reset link.")
    }
  }, [token])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Reset token is missing")
      return
    }

    clearError()
    try {
      await resetPassword({
        token,
        newPassword: data.password,
      }).unwrap()
      
      setIsSuccess(true)
      toast.success("Password reset successfully!")
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: unknown) {
      handleError(err)
    }
  }

  if (tokenError) {
    return (
      <section className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Invalid Reset Link
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {tokenError}
          </p>
        </div>
        <div className="pt-2">
          <Link href="/forgot-password">
            <Button className="w-full h-11">
              Request New Link
            </Button>
          </Link>
        </div>
      </section>
    )
  }

  if (isSuccess) {
    return (
      <section className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Password Reset
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your password has been successfully reset. Redirecting you to the login page...
          </p>
        </div>
        <div className="pt-2">
          <Link href="/login">
            <Button className="w-full h-11">
              Go to Log In
            </Button>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5 [&>header]:space-y-2 [&>header>h2]:text-3xl [&>header>p]:leading-6">
      <SectionHeading
        badge="Reset Password"
        title="Set new password"
        description="Choose a strong, secure password that you haven't used before."
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          <FieldSet className="gap-4">
            <FieldLegend variant="label" className="sr-only">
              Reset password details
            </FieldLegend>
            <Field>
              <FieldLabel htmlFor="password">New Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="********"
                disabled={isLoading}
                className="h-11 border-border/55 bg-background/80 px-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--card)_86%,transparent)]"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="********"
                disabled={isLoading}
                className="h-11 border-border/55 bg-background/80 px-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--card)_86%,transparent)]"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </Field>
          </FieldSet>
          <Field>
            <Button
              className="h-11 w-full shadow-[0_18px_34px_-22px_color-mix(in_oklch,var(--primary)_80%,transparent)]"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Resetting Password…
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </section>
  )
}
