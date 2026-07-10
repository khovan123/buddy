import Image from "next/image"

import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
  priority?: boolean
  showLabel?: boolean
}

/** Shared Buddy mark for navigation and branded surfaces. */
export function BrandLogo({
  className,
  priority = false,
  showLabel = true,
}: BrandLogoProps) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="Buddy"
        width={40}
        height={40}
        priority={priority}
        className={className}
      />
      {showLabel ? (
        <span className={cn("font-semibold tracking-tight", "text-foreground")}>
          Buddy
        </span>
      ) : null}
    </span>
  )
}
