"use client"

import { Suspense, useCallback, useEffect, useState } from "react"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { getSession, signIn } from "next-auth/react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"

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
import { otpSchema, type OtpFormValues } from "@/features/auth/schemas"
import { useResendOtpMutation } from "@/features/auth/services/auth-api"
import { setToken } from "@/features/auth/store/auth-slice"
import { CredentialPurpose, OtpPurpose } from "@/features/auth/type"
import { useGlobalError } from "@/providers/error-provider"

function OtpFormContent() {
  const router = useRouter()
  const dispatch = useDispatch()
  const searchParams = useSearchParams()

  const email = searchParams.get("email") ?? ""
  const purpose = searchParams.get("purpose") ?? OtpPurpose.EMAIL_VERIFICATION

  const { handleError, clearError } = useGlobalError()
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [resendOtp, { isLoading: resending }] = useResendOtpMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !email) {
      return
    }
    clearError()

    try {
      await resendOtp({
        email,
        purpose: purpose as OtpPurpose,
      }).unwrap()
      setResendCooldown(60)
    } catch (err: unknown) {
      handleError(err)
    }
  }, [email, purpose, resendCooldown, resendOtp, clearError, handleError])

  const onSubmit = async (data: OtpFormValues) => {
    clearError()
    setVerifying(true)

    try {
      const result = await signIn("credentials", {
        email,
        otp: data.otp,
        purpose: CredentialPurpose.VERIFY_OTP,
        redirect: false,
      })

      if (result?.error) {
        handleError(result.error)
      } else if (result?.ok) {
        const session = await getSession()
        if (session?.accessToken) {
          dispatch(setToken(session.accessToken))
        }

        const redirectTo =
          purpose === OtpPurpose.EMAIL_VERIFICATION ? "/onboarding" : "/home"
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err: unknown) {
      handleError(err)
    } finally {
      setVerifying(false)
    }
  }

  if (!email) {
    return (
      <section className="space-y-6">
        <SectionHeading
          badge="Security"
          title="OTP Verification"
          description="No email address provided."
        />
        <p className="text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Back to login
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <SectionHeading
        badge="Security"
        title="OTP Verification"
        description={`Enter the 6-digit code sent to ${email}`}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          <FieldSet className="gap-4">
            <FieldLegend variant="label" className="sr-only">
              OTP verification
            </FieldLegend>
            <Field>
              <FieldLabel htmlFor="otp">OTP code</FieldLabel>
              <Input
                id="otp"
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                disabled={verifying}
                autoFocus
                {...register("otp")}
              />
              {errors.otp ? (
                <p className="text-sm text-destructive">{errors.otp.message}</p>
              ) : (
                <FieldDescription>
                  Enter the 6-digit code sent to your email.
                </FieldDescription>
              )}
            </Field>
          </FieldSet>
          <Field>
            <Button className="w-full" type="submit" disabled={verifying}>
              {verifying ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Wrong email?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Back to login
          </Link>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="text-sm"
        >
          {resending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
        </Button>
      </div>
    </section>
  )
}

export function OtpForm() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OtpFormContent />
    </Suspense>
  )
}
