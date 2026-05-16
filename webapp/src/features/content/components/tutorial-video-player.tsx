"use client"

import { useState } from "react"

import Image from "next/image"

import { Play, Video } from "lucide-react"

import { Button } from "@/components/ui/button"

export function TutorialVideoPlayer({
  thumbnailUrl,
  trailerUrl,
  title,
}: {
  thumbnailUrl?: string | null
  trailerUrl?: string | null
  title: string
}) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (isPlaying && trailerUrl) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <video
          src={trailerUrl}
          autoPlay
          controls
          className="h-full w-full object-contain"
        />
      </div>
    )
  }

  return (
    <div
      className="group relative aspect-video w-full cursor-pointer bg-muted"
      onClick={() => trailerUrl && setIsPlaying(true)}
    >
      {thumbnailUrl ? (
        <Image
          fill
          src={thumbnailUrl}
          alt={`${title} preview`}
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="size-16 text-muted-foreground/50" />
        </div>
      )}

      {/* Play overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity group-hover:bg-black/50">
        <div className="mb-6 rounded-full border border-white/20 bg-white/10 px-6 py-2 backdrop-blur-md">
          <span className="font-headline text-sm font-bold tracking-tighter text-white uppercase italic">
            Preview
          </span>
        </div>

        {trailerUrl ? (
          <Button
            size="icon-lg"
            className="h-20 w-20 rounded-full shadow-lg transition-transform group-hover:scale-110 active:scale-95"
            onClick={(e) => {
              e.stopPropagation()
              setIsPlaying(true)
            }}
          >
            <Play className="size-10 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon-lg"
            className="h-20 w-20 rounded-full opacity-50 shadow-lg"
            disabled
          >
            <Play className="size-10 fill-current" />
          </Button>
        )}
      </div>
    </div>
  )
}
