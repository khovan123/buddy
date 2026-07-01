"use client"

import { useState, useTransition } from "react"

import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/i18n/language-provider"

import { saveModerationSettingsAction } from "../actions/content-settings-actions"
import type { ModerationSettings } from "../services/content-settings.service"

type ModerationSettingsDashboardProps = {
  settings: ModerationSettings
}

export function ModerationSettingsDashboard({
  settings,
}: ModerationSettingsDashboardProps) {
  const { t } = useI18n()

  const [enabled, setEnabled] = useState(settings.enabled)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(settings.updatedAt)
  const [source, setSource] = useState(settings.source)
  const [isPending, startTransition] = useTransition()

  const updateEnabled = (checked: boolean) => {
    const previous = enabled
    setEnabled(checked)

    startTransition(async () => {
      const result = await saveModerationSettingsAction(checked)

      if (!result.ok || !result.settings) {
        setEnabled(previous)
        toast.error(t("dashboard.moderation.error"))
        return
      }

      setEnabled(result.settings.enabled)
      setLastUpdatedAt(result.settings.updatedAt)
      setSource(result.settings.source)
      toast.success(
        result.settings.enabled
          ? t("dashboard.moderation.enabledToast")
          : t("dashboard.moderation.disabledToast")
      )
    })
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-normal">
          {t("dashboard.moderation.title")}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("dashboard.moderation.description")}
        </p>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label
                  htmlFor="dashboard-moderation-enabled"
                  className="text-base font-semibold"
                >
                  {t("dashboard.moderation.label")}
                </Label>
                <Badge variant={enabled ? "default" : "outline"}>
                  {enabled
                    ? t("dashboard.moderation.enabled")
                    : t("dashboard.moderation.disabled")}
                </Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("dashboard.moderation.hint")}
              </p>
            </div>
          </div>

          <Switch
            id="dashboard-moderation-enabled"
            checked={enabled}
            disabled={isPending}
            onCheckedChange={updateEnabled}
          />
        </div>

        <div className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              {t("dashboard.moderation.source")}
            </p>
            <p className="font-medium">
              {source === "runtime"
                ? t("dashboard.moderation.adminSetting")
                : t("dashboard.moderation.envDefault")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              {t("dashboard.moderation.lastUpdated")}
            </p>
            <p className="font-medium">
              {lastUpdatedAt
                ? new Date(lastUpdatedAt).toLocaleString()
                : t("dashboard.moderation.neverUpdated")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
