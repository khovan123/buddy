"use client"

import { motion } from "framer-motion"

import type { HydratedStep } from "@/features/intro/utils/how-it-works.data"

interface StepContentProps {
  step: HydratedStep
  index: number
  onEnter: (id: string) => void
}

export function StepContent({ step, index, onEnter }: StepContentProps) {
  return (
    <motion.div
      viewport={{ margin: "-50% 0px -50% 0px" }}
      onViewportEnter={() => onEnter(step.id)}
      className="flex min-h-[60vh] flex-col justify-center py-16 md:min-h-screen"
    >
      <div className="flex items-start gap-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {index + 1}
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold md:text-4xl">{step.title}</h2>
          <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
            {step.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
