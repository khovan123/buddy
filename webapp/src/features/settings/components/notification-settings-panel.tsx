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
import { extractApiError } from "@/types/api"

type NotificationKey =
  | "productUpdates"
  | "learningReminders"
  | "walletEvents"
  | "creatorSales"
  | "weeklyDigest"

const NOTIFICATION_GROUPS = [
  {
    title: "Account",
    icon: Bell,
    items: [
      {
        key: "productUpdates",
        label: "Product updates",
        description:
          "Changes to Buddy features, plan limits, and workspace tools.",
      },
      {
        key: "learningReminders",
        label: "Learning reminders",
        description:
          "Useful nudges for unfinished resources and saved tutorials.",
      },
    ],
  },
  {
    title: "Billing",
    icon: Wallet,
    items: [
      {
        key: "walletEvents",
        label: "Wallet and payout events",
        description:
          "Deposits, withdrawals, failed payments, and payout status changes.",
      },
      {
        key: "creatorSales",
        label: "Creator sales",
        description:
          "Sales, refunds, and revenue events for your creator account.",
      },
    ],
  },
  {
    title: "Digest",
    icon: Mail,
    items: [
      {
        key: "weeklyDigest",
        label: "Weekly email digest",
        description: "A short weekly summary of learning and creator activity.",
      },
    ],
  },
] as const

export function NotificationSettingsPanel() {
  const { data, isFetching } = useGetNotificationPreferencesQuery()

  const settings = data?.data ?? DEFAULT_NOTIFICATION_PREFERENCES

  return (
    <NotificationSettingsForm
      key={settings.updatedAt ?? "default"}
      initialSettings={settings}
      isFetching={isFetching}
    />
  )
}

function NotificationSettingsForm({
  initialSettings,
  isFetching,
}: {
  initialSettings: NotificationPreferences
  isFetching: boolean
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
      toast.success("Notification preferences saved.")
    } catch (error) {
      toast.error(extractApiError(error))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Bell className="size-4" />
          Delivery preferences
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Choose which product, billing, and creator events should interrupt
          your inbox. Security alerts always stay enabled.
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
                <p className="text-sm font-medium">Security alerts</p>
                <FieldDescription>
                  Login, password, and account protection emails are always
                  sent.
                </FieldDescription>
              </div>
            </div>
            <Button onClick={saveSettings} disabled={isLoading || isFetching}>
              {isLoading || isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
