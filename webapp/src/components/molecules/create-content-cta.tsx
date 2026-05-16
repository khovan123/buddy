"use client"

import { useState } from "react"

import { Plus } from "lucide-react"

import { CreateContentModal } from "@/components/organisms/create-content-modal"
import { Button } from "@/components/ui/button"

export function CreateContentCTA() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="icon-sm"
        className="group gap-1.5 font-semibold"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" />
      </Button>
      <CreateContentModal open={open} onOpenChange={setOpen} />
    </>
  )
}
