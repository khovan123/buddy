"use client"

import { useEffect, useRef, useState } from "react"

import Hls from "hls.js"

type LibraryTutorialVideoPlayerProps = {
  sourceUrl: string
  fallbackUrl?: string | null
}

function isHlsSource(url: string) {
  return /\.m3u8(?:$|[?#])/.test(url)
}

export function LibraryTutorialVideoPlayer({
  sourceUrl,
  fallbackUrl,
}: LibraryTutorialVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [useFallback, setUseFallback] = useState(false)
  const activeSource = useFallback && fallbackUrl ? fallbackUrl : sourceUrl

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    if (!isHlsSource(activeSource)) {
      video.src = activeSource
      return
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeSource
      return
    }

    if (!Hls.isSupported()) {
      if (fallbackUrl && fallbackUrl !== activeSource) {
        video.src = fallbackUrl
      }
      return
    }

    const hls = new Hls()
    hls.loadSource(activeSource)
    hls.attachMedia(video)
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal && fallbackUrl && fallbackUrl !== activeSource) {
        setUseFallback(true)
      }
    })

    return () => {
      hls.destroy()
    }
  }, [activeSource, fallbackUrl])

  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      playsInline
      className="h-full w-full object-cover"
      onError={() => {
        if (fallbackUrl && fallbackUrl !== activeSource) {
          setUseFallback(true)
        }
      }}
    >
      Your browser does not support HTML5 video playback.
    </video>
  )
}
