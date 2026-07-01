"use client"

import Image from "next/image"

import { Skeleton } from "boneyard-js/react"
import { BookOpen, FileText, Star } from "lucide-react"

import { useI18n } from "@/i18n/language-provider"

import { LearningCardShell, LearningOrbit } from "./learning-card-shell"

export type ProfileItem = {
  title: string
  description: string
  price: string
  rating: string
  reviews: string
  type: string
  thumbnailUrl?: string
  badge?: string
}

type ProfileItemCardProps = {
  item?: ProfileItem
  isLoading?: boolean
}

export function ProfileCard({
  item,
  isLoading = false,
}: ProfileItemCardProps) {
  const { t } = useI18n()
  const priceLabel =
    item?.price?.trim().toLowerCase() === "free" ? t("common.free") : item?.price

  return (
    <Skeleton
      name="profile-item-card"
      loading={isLoading}
      className="flex h-full flex-col rounded-xl *:flex-1"
    >
      <LearningCardShell className="group/profile flex-1">
        <div className="relative z-10 h-56 overflow-hidden rounded-b-[1.75rem] bg-muted">
          {item?.thumbnailUrl ? (
            <Image
              fill
              src={item.thumbnailUrl}
              alt={item.title}
              className="object-cover transition duration-500 group-hover/profile:scale-105"
              sizes="(max-width: 1280px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_20%,color-mix(in_oklch,var(--education-sage)_18%,transparent),transparent_52%)]">
              <FileText className="size-10 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/78 via-background/6 to-transparent" />
          {item?.badge ? (
            <span className="absolute top-4 right-4 rounded-full border border-white/15 bg-background/78 px-3 py-1 text-xs font-bold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md">
              {item.badge}
            </span>
          ) : null}
        </div>

        <div className="relative z-10 flex flex-1 flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-3xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
                <BookOpen className="size-3.5 text-primary" />
                {item?.type || "Type"}
              </div>
              <h4 className="line-clamp-2 text-lg leading-tight font-bold tracking-tight text-foreground transition group-hover/profile:text-primary">
                {item?.title || "Item Title"}
              </h4>
            </div>
            <span className="shrink-0 rounded-2xl border border-border/70 bg-background/58 px-3 py-2 text-lg font-black text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              {priceLabel || "—"}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {item?.description || "Description placeholder"}
          </p>

          <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full border border-education-gold/25 bg-education-gold/14">
                <Star className="size-4 fill-education-gold text-education-gold" />
              </span>
              <span className="text-sm font-bold text-foreground">
                {item?.rating || "—"}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({item?.reviews || "0"})
                </span>
              </span>
            </div>
            <span className="h-2 w-16 overflow-hidden rounded-full bg-muted">
              <span className="block h-full w-2/3 animate-[pulse_2.8s_ease-in-out_infinite] rounded-full bg-primary/70" />
            </span>
          </div>
        </div>
        <LearningOrbit active />
      </LearningCardShell>
    </Skeleton>
  )
}
