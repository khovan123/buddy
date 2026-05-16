import { CollectionCard } from "@/components/molecules/collection-card"

export default function ResourceCollectionsLoading() {
  return (
    <section className="space-y-10 pb-12">
      {/* Sử dụng Skeleton hoặc block tương đương cho Header chưa có component riêng */}
      <header className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-80 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded bg-muted" />
      </header>

      {/* Top Collection Loading */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-7 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-5 w-56 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="max-w-sm">
          <CollectionCard isLoading={true} />
        </div>
      </section>

      {/* All Collections Loading */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-7 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-5 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CollectionCard key={i} isLoading={true} />
          ))}
        </div>
      </section>
    </section>
  )
}
