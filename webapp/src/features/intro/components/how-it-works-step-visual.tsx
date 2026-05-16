"use client"

import { motion } from "framer-motion"

import type { HydratedStep } from "@/features/intro/utils/how-it-works.data"
import { cn } from "@/lib/utils"

interface StepVisualProps {
  step: HydratedStep
  isActive: boolean
}

export function StepVisual({ step, isActive }: StepVisualProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.95 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "absolute inset-0 flex items-center justify-center p-8",
        isActive ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border bg-card/50 shadow-2xl backdrop-blur-sm">
        <step.icon className="h-24 w-24 text-primary opacity-80" />
        <h3 className="mt-8 text-2xl font-bold text-card-foreground">
          {step.title}
        </h3>
        <p className="mt-4 max-w-sm text-center text-muted-foreground">
          {step.description}
        </p>
      </div>
    </motion.div>
  )
}
