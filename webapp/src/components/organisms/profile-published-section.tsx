"use client"

import { useCallback, useState, useTransition } from "react"

import {
  ProfileCard,
  type ProfileItem,
} from "@/components/molecules/profile-card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/language-provider"
import { cn } from "@/lib/utils"

type ProfileTab = "tutorials" | "resources" | "collections"

type FetchTabResult = { items: ProfileItem[]; total: number }

type ProfilePublishedSectionProps = {
  /** Pre-fetched default tab items (tutorials) from server component */
  initialItems: ProfileItem[]
  /** Pre-fetched counts per tab from server component */
  initialCounts: Record<ProfileTab, number>
  /** Server action to fetch a specific tab's data */
  fetchTab: (tab: ProfileTab) => Promise<FetchTabResult>
}

export function ProfilePublishedSection({
  initialItems,
  initialCounts,
  fetchTab,
}: ProfilePublishedSectionProps) {
  const { t } = useI18n()
  const [active, setActive] = useState<ProfileTab>("tutorials")
  const [items, setItems] = useState<ProfileItem[]>(initialItems)
  const [counts, setCounts] = useState(initialCounts)
  const [isPending, startTransition] = useTransition()
  const tabs: { key: ProfileTab; label: string }[] = [
    {
      key: "tutorials",
      label: t("profile.published.tutorials"),
    },
    {
      key: "resources",
      label: t("profile.published.resources"),
    },
    {
      key: "collections",
      label: t("profile.published.collections"),
    },
  ]

  const switchTab = useCallback(
    (tab: ProfileTab) => {
      if (tab === active) {
        return
      }

      startTransition(() => setActive(tab))
      fetchTab(tab)
        .then((result) => {
          startTransition(() => {
            setItems(result.items)
            setCounts((prev) => ({ ...prev, [tab]: result.total }))
          })
        })
        .catch((err) => {
          console.error("fetchTab error:", err)
          startTransition(() => {
            setItems([])
          })
        })
    },
    [active, fetchTab]
  )

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center gap-6 border-b border-border pb-4">
        {tabs.map(({ key, label }) => (
          <Button
            key={key}
            variant="link"
            onClick={() => switchTab(key)}
            disabled={isPending}
            className={cn(
              "relative h-auto rounded-none px-0 pb-3 text-sm font-medium no-underline! after:absolute after:right-0 after:-bottom-4 after:left-0 after:h-0.5 after:bg-current after:transition-opacity",
              active === key
                ? "text-foreground after:opacity-100"
                : "text-muted-foreground after:opacity-0 hover:text-foreground hover:after:opacity-100"
            )}
          >
            {label}{" "}
            <span
              className={cn(
                "text-2xs ml-2 rounded-full px-2 py-0.5",
                active === key ? "bg-primary/10" : "bg-muted"
              )}
            >
              {counts[key]}
            </span>
          </Button>
        ))}
      </div>

      <div
        className={cn(
          "grid auto-rows-fr items-stretch gap-6 transition-opacity md:grid-cols-2 xl:grid-cols-3",
          isPending && "pointer-events-none opacity-50"
        )}
      >
        {items.map((item, index) => (
          <ProfileCard key={`${item.type}-${item.title}-${index}`} item={item} />
        ))}
        {items.length === 0 && !isPending && (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            {t("profile.published.empty").replace(
              "{type}",
              tabs.find((tab) => tab.key === active)?.label.toLowerCase() ??
                active
            )}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            className="rounded-full px-8 font-semibold"
          >
            {t("profile.published.viewMore").replace(
              "{type}",
              tabs.find((tab) => tab.key === active)?.label ?? active
            )}
          </Button>
        </div>
      )}
    </section>
  )
}
