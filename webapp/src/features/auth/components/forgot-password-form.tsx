"use client"

import { useState } from "react"

import Link from "next/link"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, MailCheck } from "lucide-react"
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
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/schemas"
import { useForgotPasswordMutation } from "@/features/auth/services/auth-api"
import { useGlobalError } from "@/providers/error-provider"

export function ForgotPasswordForm() {
  const { handleError, clearError } = useGlobalError()
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    clearError()
    try {
      await forgotPassword({ email: data.email }).unwrap()
      setSubmittedEmail(data.email)
      setIsSuccess(true)
      toast.success("Password reset email sent!")
    } catch (err: unknown) {
      handleError(err)
    }
  }

  if (isSuccess) {
    return (
      <section className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Check your email
          </h2>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            We have sent a secure password reset link to{" "}
            <span className="font-semibold text-foreground">
              {submittedEmail}
            </span>
            . Please check your inbox and click the link to reset your password.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/login">
            <Button className="h-11 w-full">Back to Log In</Button>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5 [&>header]:space-y-2 [&>header>h2]:text-3xl [&>header>p]:leading-6">
      <SectionHeading
        badge="Forgot Password"
        title="Reset your password"
        description="Enter your email address and we'll send you a link to reset your password."
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          <FieldSet className="gap-4">
            <FieldLegend variant="label" className="sr-only">
              Forgot password details
            </FieldLegend>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="student@university.edu"
                disabled={isLoading}
                className="h-11 border-border/55 bg-background/80 px-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--card)_86%,transparent)]"
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">
                  {errors.email.message}
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
                  Sending Link…
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <p className="text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Log in now
        </Link>
      </p>
    </section>
  )
}
