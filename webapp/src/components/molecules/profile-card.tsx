import Image from "next/image"

import { Skeleton } from "boneyard-js/react"
import { FileText, Star } from "lucide-react"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"

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
  return (
    <Skeleton
      name="profile-item-card"
      loading={isLoading}
      className="flex h-full flex-col rounded-xl *:flex-1"
    >
      <Card className="group flex h-full! flex-1 flex-col overflow-hidden border-border/70 p-0 transition hover:-translate-y-1">
        <div className="relative h-56 bg-muted">
          {item?.thumbnailUrl ? (
            <Image
              fill
              src={item.thumbnailUrl}
              alt={item.title}
              className="object-cover transition group-hover:scale-105"
              sizes="(max-width: 1280px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="size-10 text-muted-foreground/50" />
            </div>
          )}
          {item?.badge ? (
            <span className="absolute top-4 right-4 rounded-full bg-background/90 px-3 py-1 text-xs font-bold text-primary">
              {item.badge}
            </span>
          ) : null}
        </div>

        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-lg leading-tight font-bold text-foreground transition group-hover:text-primary">
              {item?.title || "Item Title"}
            </h4>
            <span className="text-2xl font-black text-primary">
              {item?.price || "—"}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {item?.description || "Description placeholder"}
          </p>
        </CardContent>
        <CardFooter className="flex-1 items-end pb-6">
          <div className="flex w-full items-center justify-between border-t border-border pt-4">
            <Item variant="default" size="xs" className="w-auto border-0 p-0">
              <ItemMedia variant="icon">
                <Star className="size-4 fill-amber-500 text-amber-500" />
              </ItemMedia>
              <ItemTitle className="text-sm font-bold text-foreground">
                {item?.rating || "—"}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({item?.reviews || "0"})
                </span>
              </ItemTitle>
            </Item>
            <span className="text-2xs font-bold tracking-widest text-muted-foreground uppercase">
              {item?.type || "Type"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Skeleton>
  )
}
