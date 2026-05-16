"use client"

import { type ReactNode } from "react"

import { motion, type Variant } from "framer-motion"

import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Shared animation variants                                          */
/* ------------------------------------------------------------------ */

const fadeUp: Record<string, Variant> = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const fadeIn: Record<string, Variant> = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const scaleIn: Record<string, Variant> = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

const VARIANT_MAP = {
  "fade-up": fadeUp,
  "fade-in": fadeIn,
  "scale-in": scaleIn,
} as const

type AnimationVariant = keyof typeof VARIANT_MAP

/* ------------------------------------------------------------------ */
/*  MotionSection – scroll-triggered section reveal                    */
/* ------------------------------------------------------------------ */

interface MotionSectionProps {
  children: ReactNode
  className?: string
  variant?: AnimationVariant
  delay?: number
  duration?: number
  /** Amount of element visible before triggering (0-1) */
  threshold?: number
  as?: "section" | "div" | "article" | "header"
}

export function MotionSection({
  children,
  className,
  variant = "fade-up",
  delay = 0,
  duration = 0.6,
  threshold = 0.2,
  as = "div",
}: MotionSectionProps) {
  const Component = motion.create(as)

  return (
    // eslint-disable-next-line react-hooks/static-components
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{
        once: true,
        amount: threshold === 0 ? "some" : threshold,
        margin: "0px 0px 50px 0px",
      }}
      variants={VARIANT_MAP[variant]}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}

/* ------------------------------------------------------------------ */
/*  MotionStagger – staggered children reveal                          */
/* ------------------------------------------------------------------ */

interface MotionStaggerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  variant?: AnimationVariant
  duration?: number
  threshold?: number
}

const staggerContainer = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: {
      staggerChildren: staggerDelay,
    },
  }),
}

export function MotionStagger({
  children,
  className,
  staggerDelay = 0.1,
  variant = "fade-up",
  duration = 0.5,
  threshold = 0.15,
}: MotionStaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{
        once: true,
        amount: threshold === 0 ? "some" : threshold,
        margin: "0px 0px 50px 0px",
      }}
      variants={staggerContainer}
      custom={staggerDelay}
      className={cn(className)}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={VARIANT_MAP[variant]}
              transition={{
                duration,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  MotionHero – entrance animation for hero elements                  */
/* ------------------------------------------------------------------ */

interface MotionHeroProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
}

export function MotionHero({
  children,
  className,
  delay = 0,
  duration = 0.8,
}: MotionHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
