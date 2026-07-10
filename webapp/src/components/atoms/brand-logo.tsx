import Image from "next/image"

type BrandLogoProps = {
  className?: string
  priority?: boolean
}

/** Shared Buddy mark for navigation and branded surfaces. */
export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Buddy"
      width={40}
      height={40}
      priority={priority}
      className={className}
    />
  )
}
