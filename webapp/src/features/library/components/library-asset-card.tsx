import Image from "next/image"
import Link from "next/link"

import { BookOpen, Cuboid, FolderKanban, PlayCircle } from "lucide-react"


export const LibraryAssetKind = {
  Tutorial: "Tutorial",
  AssetPack: "Asset Pack",
  EBook: "E-Book",
  Components: "Components",
} as const
export type LibraryAssetKind =
  (typeof LibraryAssetKind)[keyof typeof LibraryAssetKind]

export type LibraryAsset = {
  slug: string
  title: string
  description: string
  author: string
  image: string
  kind: LibraryAssetKind
  sourcePath: string
  disabled?: boolean
  authorAvatar?: string
}

const kindIconMap: Record<LibraryAssetKind, typeof PlayCircle> = {
  [LibraryAssetKind.Tutorial]: PlayCircle,
  [LibraryAssetKind.AssetPack]: FolderKanban,
  [LibraryAssetKind.EBook]: BookOpen,
  [LibraryAssetKind.Components]: Cuboid,
}

type LibraryAssetCardProps = {
  asset: LibraryAsset
  onClick?: () => void
}

export function LibraryAssetCard({ asset, onClick }: LibraryAssetCardProps) {
  const KindIcon = kindIconMap[asset.kind]
  const detailPath =
    asset.kind === LibraryAssetKind.Tutorial
      ? `/library/tutorials/${asset.slug}`
      : `/library/resources/${asset.slug}`

  if (asset.disabled) {
    return (
      <article className="group flex h-full w-full flex-col overflow-hidden opacity-60 grayscale">
        {/* Cover Image */}
        <div
          className="relative w-full overflow-hidden border border-border/50 bg-muted"
          style={{ aspectRatio: "304/171" }}
        >
          <Image
            fill
            src={asset.image}
            alt={asset.title}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <span className="rounded-md border border-border bg-background/95 px-2 py-1 text-xs font-medium tracking-wide text-foreground">
              Unavailable
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex w-full flex-1 flex-col gap-1 pt-2 pb-4">
          <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground">
            {asset.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {asset.author}
          </p>
        </div>
      </article>
    )
  }

  return (
    <Link
      href={detailPath}
      onClick={onClick}
      aria-label={`Open ${asset.title}`}
      className="group block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 overflow-hidden"
    >
      <article className="flex h-full flex-col">
        {/* Cover Image */}
        <div className="relative w-full overflow-hidden border border-border/50 bg-muted" style={{ aspectRatio: '304/171' }}>
          <Image
            fill
            src={asset.image}
            alt={asset.title}
            className="object-cover transition-opacity duration-300 group-hover:opacity-90"
            sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
             <div className="rounded-full bg-white/90 p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
               <KindIcon className="size-6 text-primary" />
             </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex w-full flex-1 flex-col gap-1 pt-2 pb-4">
           <h3 className="line-clamp-2 text-body font-bold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
             {asset.title}
           </h3>
           <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5">
             {asset.author}
           </p>
           {/* Progress Placeholder (Udemy style My Learning) */}
           <div className="mt-auto pt-2 text-xs font-semibold text-primary">
              {asset.kind === LibraryAssetKind.Tutorial ? "START COURSE" : "OPEN RESOURCE"}
           </div>
        </div>
      </article>
    </Link>
  )
}
