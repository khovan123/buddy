"use client"

import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChangePasswordMutation } from "@/features/auth/services/auth-api"
import { extractApiError } from "@/types/api"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Use 128 characters or fewer.")
      .regex(/[A-Z]/, "Add at least one uppercase letter.")
      .regex(/[0-9]/, "Add at least one number."),
    confirmPassword: z.string().min(8, "Confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export function SecuritySettingsPanel() {
  const [changePassword, { isLoading }] = useChangePasswordMutation()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const newPassword = useWatch({ control, name: "newPassword" }) ?? ""
  const passwordChecks = useMemo(
    () => [
      { label: "8+ characters", active: newPassword.length >= 8 },
      { label: "Uppercase letter", active: /[A-Z]/.test(newPassword) },
      { label: "Number", active: /[0-9]/.test(newPassword) },
    ],
    [newPassword]
  )

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap()
      reset()
      toast.success("Password changed successfully.")
    } catch (error) {
      toast.error(extractApiError(error))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <ShieldCheck className="size-4" />
          Account security
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Keep your password current. Updating it signs out other active
          sessions so the account stays under your control.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field>
              <Label htmlFor="settings-current-password">
                Current password
              </Label>
              <Input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              <FieldError>{errors.currentPassword?.message}</FieldError>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="settings-new-password">New password</Label>
                <Input
                  id="settings-new-password"
                  type="password"
                  autoComplete="new-password"
                  {...register("newPassword")}
                />
                <FieldError>{errors.newPassword?.message}</FieldError>
              </Field>

              <Field>
                <Label htmlFor="settings-confirm-password">
                  Confirm password
                </Label>
                <Input
                  id="settings-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                <FieldError>{errors.confirmPassword?.message}</FieldError>
              </Field>
            </div>

            <FieldDescription className="flex flex-wrap gap-3">
              {passwordChecks.map((check) => (
                <span
                  key={check.label}
                  className={
                    check.active
                      ? "inline-flex items-center gap-1 text-foreground"
                      : "inline-flex items-center gap-1"
                  }
                >
                  <CheckCircle2 className="size-3.5" />
                  {check.label}
                </span>
              ))}
            </FieldDescription>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
