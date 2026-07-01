"use client"

import { useState } from "react"

import { Bell, Loader2, Mail, Save, ShieldCheck, Wallet } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldDescription } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/features/settings/services/settings-api"
import { useI18n } from "@/i18n/language-provider"
import { extractApiError } from "@/types/api"

type NotificationKey =
  | "productUpdates"
  | "learningReminders"
  | "walletEvents"
  | "creatorSales"
  | "weeklyDigest"

const NOTIFICATION_GROUPS = [
  {
    title: "Tài khoản",
    icon: Bell,
    items: [
      {
        key: "productUpdates",
        label: "Cập nhật sản phẩm",
        description:
          "Thay đổi về tính năng Buddy, giới hạn gói và công cụ không gian làm việc.",
      },
      {
        key: "learningReminders",
        label: "Nhắc học tập",
        description:
          "Các nhắc nhở hữu ích cho tài liệu chưa xem hết và bài học đã lưu.",
      },
    ],
  },
  {
    title: "Thanh toán",
    icon: Wallet,
    items: [
      {
        key: "walletEvents",
        label: "Ví và nhận tiền",
        description:
          "Nạp tiền, rút tiền, thanh toán thất bại và thay đổi trạng thái nhận tiền.",
      },
      {
        key: "creatorSales",
        label: "Doanh số nhà sáng tạo",
        description:
          "Các sự kiện bán hàng, hoàn tiền và doanh thu cho tài khoản creator của bạn.",
      },
    ],
  },
  {
    title: "Tổng hợp",
    icon: Mail,
    items: [
      {
        key: "weeklyDigest",
        label: "Email tổng hợp hằng tuần",
        description:
          "Bản tóm tắt ngắn hằng tuần về hoạt động học tập và sáng tạo nội dung.",
      },
    ],
  },
] as const

export function NotificationSettingsPanel() {
  const { data, isFetching } = useGetNotificationPreferencesQuery()
  const { t } = useI18n()

  const settings = data?.data ?? DEFAULT_NOTIFICATION_PREFERENCES

  return (
    <NotificationSettingsForm
      key={settings.updatedAt ?? "default"}
      initialSettings={settings}
      isFetching={isFetching}
      savedLabel={t("settings.savedNotifications")}
    />
  )
}

function NotificationSettingsForm({
  initialSettings,
  isFetching,
  savedLabel,
}: {
  initialSettings: NotificationPreferences
  isFetching: boolean
  savedLabel: string
}) {
  const [settings, setSettings] =
    useState<NotificationPreferences>(initialSettings)
  const [updatePreferences, { isLoading }] =
    useUpdateNotificationPreferencesMutation()

  const setValue = (key: NotificationKey, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const saveSettings = async () => {
    try {
      const { updatedAt, ...payload } = settings
      void updatedAt
      await updatePreferences(payload).unwrap()
      toast.success(savedLabel)
    } catch (error) {
      toast.error(extractApiError(error))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Bell className="size-4" />
          Tùy chọn nhận thông báo
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Thông báo</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Chọn những cập nhật về sản phẩm, thanh toán và hoạt động nhà sáng tạo
          mà bạn muốn nhận. Cảnh báo bảo mật luôn được bật.
        </p>
      </div>

      <div className="grid gap-4">
        {NOTIFICATION_GROUPS.map((group) => (
          <Card key={group.title} className="border-border/70">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <group.icon className="size-4" />
              </div>
              <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/70">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <FieldDescription>{item.description}</FieldDescription>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={(value) => setValue(item.key, value)}
                    aria-label={item.label}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card className="border-border/70 bg-muted/30">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Cảnh báo bảo mật</p>
                <FieldDescription>
                  Email về đăng nhập, mật khẩu và bảo vệ tài khoản sẽ luôn được
                  gửi.
                </FieldDescription>
              </div>
            </div>
            <Button onClick={saveSettings} disabled={isLoading || isFetching}>
              {isLoading || isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Lưu tùy chọn
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
