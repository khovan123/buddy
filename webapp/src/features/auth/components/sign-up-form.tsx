"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

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
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas"
import { useRegisterMutation } from "@/features/auth/services/auth-api"
import { OtpPurpose } from "@/features/auth/type"
import { useGlobalError } from "@/providers/error-provider"

import { OAuthButtons } from "./oauth-buttons"

export function SignUpForm() {
  const router = useRouter()
  const { handleError, clearError } = useGlobalError()
  const [registerUser, { isLoading }] = useRegisterMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nickname: "", email: "", password: "" },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    clearError()

    try {
      const result = await registerUser(data).unwrap()

      if (result.data?.requiresVerification) {
        router.push(
          `/otp?email=${encodeURIComponent(data.email)}&purpose=${OtpPurpose.EMAIL_VERIFICATION}`
        )
      }
    } catch (err: unknown) {
      handleError(err)
    }
  }

  return (
    <section className="space-y-6">
      <SectionHeading
        badge="Sign Up"
        title="Register Account"
        description="Create an account to start buying, selling materials, courses, and join a dynamic education community."
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          <FieldSet className="gap-4">
            <FieldLegend variant="label" className="sr-only">
              Registration details
            </FieldLegend>
            <Field>
              <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
              <Input
                id="nickname"
                placeholder="John Doe"
                disabled={isLoading}
                {...register("nickname")}
              />
              {errors.nickname ? (
                <p className="text-sm text-destructive">
                  {errors.nickname.message}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                // type="email"
                placeholder="student@university.edu"
                disabled={isLoading}
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
                disabled={isLoading}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              ) : (
                <FieldDescription>
                  Password should be at least 8 characters for better security.
                </FieldDescription>
              )}
            </Field>
          </FieldSet>
          <Field>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Log in now
        </Link>
      </p>
      <OAuthButtons />
    </section>
  )
}
