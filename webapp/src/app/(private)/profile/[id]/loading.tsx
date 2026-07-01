import { ProfileCard } from "@/components/molecules/profile-card"
import { getServerTranslator } from "@/i18n/server"

export default async function ProfileDetailLoading() {
  const { t } = await getServerTranslator()
  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("profile.detail.title")}
      </h1>

      {/* Hero Skeleton (SeoHero equivalent) */}
      <div className="flex min-h-75 w-full flex-col items-center justify-center gap-6 rounded-2xl bg-muted/30 p-8 text-center md:min-h-100">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-12 w-3/4 animate-pulse rounded bg-muted md:h-16" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-4 flex gap-4">
          <div className="h-10 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      {/* SectionHeading Skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>

      {/* MetaChip Skeleton */}
      <div className="flex flex-wrap gap-2">
        <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
      </div>

      {/* ProfilePublishedSection Skeleton */}
      <section className="space-y-8">
        <div className="flex flex-wrap items-center gap-6 border-b border-border pb-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid auto-rows-fr items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProfileCard key={i} isLoading={true} />
          ))}
        </div>

        <div className="flex justify-center">
          <div className="h-10 w-48 animate-pulse rounded-full bg-muted" />
        </div>
      </section>
    </section>
  )
}
