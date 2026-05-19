"use client"

import { m } from "framer-motion"

export function ExploreBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
      <m.div
        className="blur-30 absolute -top-40 right-0 h-120 w-120 rounded-full bg-primary/8"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2],
          x: [0, 15, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <m.div
        className="blur-25 absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-accent/10"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, -10, 0],
          y: [0, 8, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
    </div>
  )
}
