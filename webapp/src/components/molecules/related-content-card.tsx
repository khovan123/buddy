import Image from "next/image"
import Link from "next/link"

import { Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Item, ItemMedia, ItemTitle } from "@/components/ui/item"

type RelatedContentCardBaseProps = {
  title: string
  href: string
  image: string
}

type RelatedResourceCardProps = RelatedContentCardBaseProps & {
  variant: "resource"
  badge?: string
  price: string
  rating: string
}

type RelatedTutorialCardProps = RelatedContentCardBaseProps & {
  variant: "tutorial"
  duration: string
  level: string
}

type RelatedContentCardProps =
  | RelatedResourceCardProps
  | RelatedTutorialCardProps

export function RelatedContentCard(props: RelatedContentCardProps) {
  return (
    <Link href={props.href} className="group block h-full">
      <Card className="h-full overflow-hidden rounded-xl border-border/20 bg-card p-0 shadow-sm transition-all group-hover:shadow-md">
        <div className="relative aspect-4/3 bg-muted">
          <Image
            fill
            src={props.image}
            alt={props.title}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />

          {props.variant === "resource" && props.badge ? (
            <Badge
              variant="secondary"
              className="absolute top-3 right-3 rounded-sm shadow-sm"
            >
              {props.badge}
            </Badge>
          ) : null}

          {props.variant === "tutorial" ? (
            <>
              <Badge
                variant="secondary"
                className="absolute top-3 right-3 rounded-sm shadow-sm"
              >
                {props.duration}
              </Badge>
              <Badge
                variant="default"
                className="absolute top-3 left-3 rounded-sm shadow-sm"
              >
                {props.level}
              </Badge>
            </>
          ) : null}
        </div>

        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <div className="space-y-1">
            <p className="text-3xs font-semibold tracking-wide text-primary uppercase">
              {props.variant === "resource" ? "Resource" : "Tutorial"}
            </p>
            <h4 className="line-clamp-2 text-base font-bold text-foreground">
              {props.title}
            </h4>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3">
            {props.variant === "resource" ? (
              <>
                <span className="font-bold text-primary">{props.price}</span>
                <Item
                  variant="default"
                  size="xs"
                  className="w-auto border-0 p-0"
                >
                  <ItemMedia variant="icon">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                  </ItemMedia>
                  <ItemTitle className="text-xs font-medium text-muted-foreground">
                    {props.rating}
                  </ItemTitle>
                </Item>
              </>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {props.level} learning path
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
