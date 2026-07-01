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
import { useI18n } from "@/i18n/language-provider"
import { extractApiError } from "@/types/api"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
      .max(128, "Mật khẩu tối đa 128 ký tự.")
      .regex(/[A-Z]/, "Cần ít nhất 1 chữ in hoa.")
      .regex(/[0-9]/, "Cần ít nhất 1 chữ số."),
    confirmPassword: z.string().min(8, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
    path: ["newPassword"],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export function SecuritySettingsPanel() {
  const [changePassword, { isLoading }] = useChangePasswordMutation()
  const { t } = useI18n()

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
      { label: "Từ 8 ký tự", active: newPassword.length >= 8 },
      { label: "Có chữ in hoa", active: /[A-Z]/.test(newPassword) },
      { label: "Có chữ số", active: /[0-9]/.test(newPassword) },
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
      toast.success(t("settings.savedPassword"))
    } catch (error) {
      toast.error(extractApiError(error))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <ShieldCheck className="size-4" />
          Bảo mật tài khoản
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Bảo mật</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Hãy luôn cập nhật mật khẩu. Khi đổi mật khẩu, các phiên đăng nhập
          khác sẽ bị đăng xuất để tài khoản luôn nằm trong quyền kiểm soát của
          bạn.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field>
              <Label htmlFor="settings-current-password">
                Mật khẩu hiện tại
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
                <Label htmlFor="settings-new-password">Mật khẩu mới</Label>
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
                  Xác nhận mật khẩu
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
              Cập nhật mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
