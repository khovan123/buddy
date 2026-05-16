import Link from "next/link"

import { Button } from "@/components/ui/button"

import { Card, CardContent } from "../ui/card"

type SeoHeroProps = {
  badge: string
  title: string
  description: string
  primaryCta?: string
  secondaryCta?: string
}

export function SeoHero({
  title,
  description,
  primaryCta,
  secondaryCta,
}: SeoHeroProps) {
  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight text-card-foreground md:text-5xl">
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground md:text-base">
          {description}
        </p>
        <div className="flex flex-wrap gap-3">
          {primaryCta && (
            <Button asChild>
              <Link href={"/explore"}>{primaryCta}</Link>
            </Button>
          )}
          {secondaryCta && (
            <Button variant="outline" asChild>
              <Link href={"/profile"}>{secondaryCta}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
