import Image from "next/image"

import { Bell, Mail, Wallet } from "lucide-react"

import { UserAvatar } from "@/components/atoms/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { AuthVerification } from "@/features/auth/services/auth.service"
import { isAuthVerified } from "@/features/auth/services/auth.service"
import type { UserProfile } from "@/features/user/services/user-api"
import type { CreatorStats } from "@/features/user/services/user.service"

type ProfileHeroSectionProps = {
  seoBadge: string
  me?: UserProfile | null
  stats?: CreatorStats | null
  authVerification?: AuthVerification | null
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  }
  return String(n)
}

export function ProfileHeroSection({
  seoBadge,
  me,
  stats,
  authVerification,
}: ProfileHeroSectionProps) {
  const profileName = me?.profile?.nickname || me?.nickname || "Elena Rodriguez"
  const bio =
    me?.profile?.bio ||
    "Bridging the gap between theoretical human-computer interaction and practical product design. Currently pursuing a Ph.D. in Cognitive Psychology while mentoring 500+ students on Unibuddy. Resources focus on accessibility, ethical AI, and design systems that scale."

  const followers = stats?.followers ?? 0
  const totalResources = stats?.totalResources ?? 0
  const avgRating =
    stats?.avgRating && stats?.avgRating > 0.0 ? stats?.avgRating : 0
  const ratingCount = stats?.ratingCount ?? 0
  const totalSales = stats?.totalSales ?? 0

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative h-65 md:h-90">
        <Image
          fill
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7kzGcStj8pKulNyoRYQxEHDjcTIjnWEiX0q7fZQ0sFAkjiF9s1td8EXtPNBeS_UjTG02Z_jpHvyFZOSKKR0EInvlhhfKokVXTb1gZyhXCGFP_WPPJSq9LKu2DLm0xKJzRjlix8NumHE0mqtfKujsa_YIzQxVRvCDUWrLlEgcMxknOVUMHfjXHyZYmHX_NJ58BbxG1VOJgWB0ZMOuRaEmRPua9XVaAs8Lzsbsx6P6zjDCFxbp-YLSu_L6QSuR80V8nFkZDc2YQtgmS"
          alt="Creator cover"
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
      </div>

      <div className="relative px-6 pb-8 md:px-10">
        <div className="-mt-20 flex flex-col gap-6 md:-mt-24 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-5">
            <div className="relative">
              <div>
                <UserAvatar
                  className="size-36 border-2 border-border md:size-44"
                  src={me?.profile?.avatarUrl}
                  name={profileName}
                />
              </div>
              {isAuthVerified(authVerification) ? (
                <span className="text-2xs absolute right-2 bottom-2 rounded-full bg-primary px-2 py-1 font-bold text-primary-foreground">
                  Verified
                </span>
              ) : null}
            </div>

            <div className="space-y-1 pb-2">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                {seoBadge}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
                {profileName}
              </h1>
              <p className="font-semibold text-primary">
                {me?.profile.career?.name || "Career Not Set"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:pb-2">
            <Button className="font-semibold">Follow Creator</Button>
            <Button variant="secondary" size="icon" aria-label="Send mail">
              <Mail className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Wallet">
              <Wallet className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="border-border/70">
            <CardContent className="space-y-5 p-6 md:p-8">
              <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                About the Creator
              </h3>
              <p className="text-base leading-relaxed whitespace-pre-line text-muted-foreground md:text-lg">
                {bio}
              </p>
              <div className="flex flex-wrap gap-2">
                {me?.profile.skills && me.profile.skills.length > 0 ? (
                  me.profile.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground"
                    >
                      {skill.name}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                    No skills highlighted
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/15 bg-primary/5">
            <CardContent className="p-6 md:p-8">
              <h3 className="mb-6 text-xs font-bold tracking-widest text-primary uppercase">
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-2xl font-black text-primary">
                    {formatCompact(followers)}
                  </p>
                  <p className="text-3xs font-bold tracking-wider text-muted-foreground uppercase">
                    Followers
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-primary">
                    {formatCompact(totalResources)}
                  </p>
                  <p className="text-3xs font-bold tracking-wider text-muted-foreground uppercase">
                    Resources
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-primary">
                    {avgRating > 0 ? `${avgRating.toFixed(1)}/5` : "N/A"}
                  </p>
                  <p className="text-3xs font-bold tracking-wider text-muted-foreground uppercase">
                    Avg Rating{ratingCount > 0 ? ` (${ratingCount})` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-primary">
                    {formatCompact(totalSales)}
                  </p>
                  <p className="text-3xs font-bold tracking-wider text-muted-foreground uppercase">
                    Sales
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
