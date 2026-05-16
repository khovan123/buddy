import type { ReactNode } from "react"

import Link from "next/link"

type NavLinkProps = {
  href: string
  children: ReactNode
  active?: boolean
  className?: string
}

export function NavLink({
  href,
  children,
  active = false,
  className = "",
}: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted"
      } ${className}`}
    >
      {children}
    </Link>
  )
}
