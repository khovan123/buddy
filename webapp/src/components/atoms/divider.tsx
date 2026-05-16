"use client"

import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const dividerVariants = cva("bg-border", {
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
    size: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

export interface DividerProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dividerVariants> {}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(dividerVariants({ orientation, size }), className)}
      {...props}
    />
  )
)
Divider.displayName = "Divider"

export { Divider }
