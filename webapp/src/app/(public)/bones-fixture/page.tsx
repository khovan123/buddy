"use client"

import ExploreLoading from "@/app/(private)/explore/loading"
import ResourceDetailLoading from "@/app/(private)/explore/resources/[id]/loading"
import HomeLoading from "@/app/(private)/home/loading"
import { CollectionCard } from "@/components/molecules/collection-card"
import { ProfileCard } from "@/components/molecules/profile-card"
import { ResourceCard } from "@/components/molecules/resource-card"
import { TutorialCard } from "@/components/molecules/tutorial-card"

/**
 * Boneyard fixture page — only used by `npx boneyard-js build` to capture
 * bone positions from the real component layout. Not linked in the app.
 *
 * Usage: npx boneyard-js build http://localhost:8000/bones-fixture
 */
export default function BonesFixturePage() {
  return (
    <div className="space-y-12 p-8">
      <h1 className="text-lg font-bold text-muted-foreground">
        Boneyard Fixture — Skeleton Capture Page
      </h1>

      {/* Card skeletons */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          card-resource
        </h2>
        <div className="max-w-sm">
          <ResourceCard isLoading={true} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          card-tutorial
        </h2>
        <div className="max-w-sm">
          <TutorialCard isLoading={true} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          card-collection
        </h2>
        <div className="max-w-sm">
          <CollectionCard isLoading={true} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          card-profile-item
        </h2>
        <div className="max-w-sm">
          <ProfileCard isLoading={true} />
        </div>
      </section>

      {/* Detail page skeleton */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          resource-detail
        </h2>
        <ResourceDetailLoading />
      </section>

      {/* ── Page-level skeletons ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          home-page
        </h2>
        <div className="mx-auto max-w-7xl">
          <HomeLoading />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          explore-page
        </h2>
        <div className="mx-auto max-w-7xl">
          <ExploreLoading />
        </div>
      </section>
    </div>
  )
}
