"use client"

import { useRouter } from "next/navigation"

import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

type LibraryBackButtonProps = {
  label?: string
  fallbackHref?: string
  iconClassName?: string
} & Omit<React.ComponentProps<typeof Button>, "children" | "onClick">

export function LibraryBackButton({
  label = "Back to library",
  fallbackHref = "/library",
  iconClassName,
  ...buttonProps
}: LibraryBackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (globalThis.window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return (
    <Button type="button" onClick={handleBack} {...buttonProps}>
      <ArrowLeft className={iconClassName ?? "size-4"} />
      {label}
    </Button>
  )
}
