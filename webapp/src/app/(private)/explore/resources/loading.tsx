import { ResourceCard } from "@/components/molecules/resource-card"

export default function ExploreResourcesLoading() {
  return (
    <section className="space-y-10 pb-12">
      {/* Header skeleton */}
      <header className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-80 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded bg-muted" />
      </header>

      {/* Featured resource skeleton */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-6 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="max-w-sm">
          <ResourceCard isLoading />
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-6 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 19 }).map((_, i) => (
            <ResourceCard key={i} isLoading={true} />
          ))}
        </div>
      </section>
    </section>
  )
}
