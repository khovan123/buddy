"use client"

import type { CSSProperties, PointerEvent, ReactNode } from "react"

import { cn } from "@/lib/utils"

type LearningCardShellProps = {
  children: ReactNode
  className?: string
}

const baseStyle = {
  "--card-x": "50%",
  "--card-y": "0%",
  "--card-rotate-x": "0deg",
  "--card-rotate-y": "0deg",
} as CSSProperties

export function LearningCardShell({
  children,
  className,
}: LearningCardShellProps) {
  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const rotateY = ((x / rect.width - 0.5) * 7).toFixed(2)
    const rotateX = ((0.5 - y / rect.height) * 6).toFixed(2)

    target.style.setProperty("--card-x", `${x}px`)
    target.style.setProperty("--card-y", `${y}px`)
    target.style.setProperty("--card-rotate-x", `${rotateX}deg`)
    target.style.setProperty("--card-rotate-y", `${rotateY}deg`)
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    const target = event.currentTarget
    target.style.setProperty("--card-x", "50%")
    target.style.setProperty("--card-y", "0%")
    target.style.setProperty("--card-rotate-x", "0deg")
    target.style.setProperty("--card-rotate-y", "0deg")
  }

  return (
    <article
      style={baseStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative isolate flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-card/82 text-card-foreground shadow-[0_22px_54px_-42px_color-mix(in_oklch,var(--education-ink)_60%,transparent)] ring-1 ring-border/40 backdrop-blur-xl transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out [transform:perspective(900px)_rotateX(var(--card-rotate-x))_rotateY(var(--card-rotate-y))_translateY(0)] [transform-style:preserve-3d] hover:border-primary/28 hover:bg-card hover:shadow-[0_30px_72px_-48px_color-mix(in_oklch,var(--education-sage)_55%,transparent)] active:translate-y-px active:scale-[0.99]",
        "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[radial-gradient(420px_circle_at_var(--card-x)_var(--card-y),color-mix(in_oklch,var(--education-sage)_16%,transparent),transparent_42%)] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        "after:pointer-events-none after:absolute after:inset-px after:z-0 after:rounded-[1.28rem] after:border after:border-white/10 after:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
        className
      )}
    >
      {children}
    </article>
  )
}

type LearningOrbitProps = {
  className?: string
  active?: boolean
}

export function LearningOrbit({ className, active = false }: LearningOrbitProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -right-7 -bottom-7 z-0 size-28 rounded-full border border-primary/12 opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-100",
        active && "animate-[spin_18s_linear_infinite]",
        className
      )}
    >
      <span className="absolute top-3 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary/70 shadow-[0_0_0_5px_color-mix(in_oklch,var(--education-sage)_13%,transparent)]" />
      <span className="absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rounded-full bg-education-gold/80" />
      <span className="absolute right-4 bottom-5 size-1.5 rounded-full bg-foreground/45" />
    </div>
  )
}
