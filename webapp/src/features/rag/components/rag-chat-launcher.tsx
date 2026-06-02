"use client"

import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { UserProfile } from "@/features/user/services/user-api"

import { RAGChat } from "./rag-chat"

type RAGChatLauncherProps = {
  user?: UserProfile | null
  accessToken?: string | null
}

export function RAGChatLauncher({ user, accessToken }: RAGChatLauncherProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="fixed right-4 bottom-4 z-40 h-12 rounded-full px-4 shadow-lg md:right-6 md:bottom-6">
          <Sparkles className="size-4" />
          Ask Buddy
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton
        className="top-auto right-4 bottom-4 left-auto h-[min(760px,calc(100vh-2rem))] w-[min(440px,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:right-6 sm:bottom-6"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Buddy Intelligence</DialogTitle>
          <DialogDescription>
            Ask questions about courses, resources, and tutorials.
          </DialogDescription>
        </DialogHeader>
        <RAGChat
          user={user ?? undefined}
          accessToken={accessToken ?? undefined}
          compact
          className="h-full max-w-none"
        />
      </DialogContent>
    </Dialog>
  )
}
