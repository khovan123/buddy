"use client"

import dynamic from "next/dynamic"

import { cn } from "@/lib/utils"

type EducationUniverseProps = {
  className?: string
  variant?: "hero" | "ambient" | "auth"
}

const EducationUniverseScene = dynamic(
  () => import("@/components/atoms/education-universe-scene"),
  {
    ssr: false,
    loading: () => (
      <div className="learning-grid absolute inset-0 bg-primary/5" />
    ),
  }
)

export function EducationUniverse({
  className,
  variant = "hero",
}: EducationUniverseProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <EducationUniverseScene variant={variant} />
    </div>
  )
}

