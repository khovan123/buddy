"use client"

import * as React from "react"

import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  XCircle,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ButtonVariant = React.ComponentProps<typeof Button>["variant"]

export type ConfirmDialogVariant = "success" | "warning" | "error" | "confirm"

interface ConfirmDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  variant?: ConfirmDialogVariant
  icon?: React.ReactNode
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  confirmButtonVariant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  size?: "default" | "sm"
  onConfirm: () => void | Promise<void>
}

const variantConfig: Record<
  ConfirmDialogVariant,
  {
    icon: React.ComponentType<{ className?: string }>
    mediaClassName: string
    actionVariant: ButtonVariant
  }
> = {
  success: {
    icon: CheckCircle2,
    mediaClassName: "bg-primary/10 text-primary",
    actionVariant: "default",
  },
  warning: {
    icon: AlertTriangle,
    mediaClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    actionVariant: "default",
  },
  error: {
    icon: XCircle,
    mediaClassName: "bg-destructive/10 text-destructive",
    actionVariant: "destructive",
  },
  confirm: {
    icon: HelpCircle,
    mediaClassName: "bg-muted text-muted-foreground",
    actionVariant: "default",
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  variant = "confirm",
  icon,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmButtonVariant,
  loading,
  disabled,
  size,
  onConfirm,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [internalLoading, setInternalLoading] = React.useState(false)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : internalOpen
  const currentLoading = loading ?? internalLoading
  const config = variantConfig[variant]
  const Icon = config.icon

  const setCurrentOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (currentLoading) {
        return
      }

      if (!isControlled) {
        setInternalOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [currentLoading, isControlled, onOpenChange]
  )

  const handleConfirm = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault()
      if (disabled || currentLoading) {
        return
      }

      setInternalLoading(true)
      try {
        await onConfirm()
        setCurrentOpen(false)
      } finally {
        setInternalLoading(false)
      }
    },
    [currentLoading, disabled, onConfirm, setCurrentOpen]
  )

  return (
    <AlertDialog open={currentOpen} onOpenChange={setCurrentOpen}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogMedia className={cn(config.mediaClassName)}>
            {icon ?? <Icon />}
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={currentLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={confirmButtonVariant ?? config.actionVariant}
            disabled={disabled || currentLoading}
            onClick={handleConfirm}
          >
            {currentLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
