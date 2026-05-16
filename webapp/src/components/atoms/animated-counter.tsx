"use client"

import { useEffect, useRef, useState } from "react"

import { useInView } from "framer-motion"

import { cn } from "@/lib/utils"

interface AnimatedCounterProps {
  value: string
  className?: string
  duration?: number
}

/**
 * Animates a number from 0 to its target when it scrolls into view.
 * Handles formats like "100K+", "4.9/5", "2.5K+", "150+", "3X", "85%", "50K+"
 */
export function AnimatedCounter({
  value,
  className,
  duration = 2000,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const [displayValue, setDisplayValue] = useState("0")

  useEffect(() => {
    if (!isInView) {
      return
    }

    // Parse numeric part and suffix
    const match = value.match(/^([\d.]+)(.*)$/)
    if (!match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(value)
      return
    }

    const target = parseFloat(match[1])
    const suffix = match[2]
    const isDecimal = match[1].includes(".")
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = target * eased

      if (isDecimal) {
        setDisplayValue(current.toFixed(1) + suffix)
      } else {
        setDisplayValue(Math.floor(current).toString() + suffix)
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isInView, value, duration])

  return (
    <span ref={ref} className={cn(className)}>
      {displayValue}
    </span>
  )
}
