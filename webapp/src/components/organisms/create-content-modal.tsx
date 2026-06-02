"use client"

import Link from "next/link"

import { FileText, FolderOpen, Video } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface CreateContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const contentOptions = [
  {
    type: "resource" as const,
    href: "/home/resources/create",
    icon: FileText,
    title: "Resource",
    description: "Upload PDFs, cheatsheets, or study guides for your students.",
    iconBg: "bg-primary/10 text-primary",
    featured: false,
  },
  {
    type: "tutorial" as const,
    href: "/home/tutorials/create",
    icon: Video,
    title: "Tutorial",
    description:
      "Create engaging video lessons with interactive quizzes and markers.",
    iconBg: "bg-primary-foreground/20 text-primary-foreground",
    featured: true,
  },
  {
    type: "collection" as const,
    href: "/home/collections/create",
    icon: FolderOpen,
    title: "Collection",
    description:
      "Bundle multiple resources and tutorials into a cohesive learning path.",
    iconBg: "bg-secondary text-secondary-foreground",
    featured: false,
  },
]

export function CreateContentModal({
  open,
  onOpenChange,
}: CreateContentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-0 p-0 sm:max-w-2xl sm:rounded-2xl">
        <div className="p-8 md:p-10">
          <DialogHeader className="mb-8 space-y-2">
            <DialogTitle className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Create New Content
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose the type of content you want to create.
            </DialogDescription>
          </DialogHeader>

          {/* Option Cards */}
          <div className="grid auto-rows-fr items-stretch grid-cols-1 gap-4 md:grid-cols-3">
            {contentOptions.map((option) => (
              <DialogClose key={option.type} asChild>
                <Link
                  href={option.href}
                  className={cn(
                    "group relative flex h-full flex-col items-start rounded-xl p-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    option.featured
                      ? "bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 md:-translate-y-1"
                      : "bg-muted/50 hover:bg-muted hover:shadow-md"
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 flex size-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                      option.iconBg
                    )}
                  >
                    <option.icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold">{option.title}</h3>
                  <p
                    className={cn(
                      "mt-1 text-xs leading-relaxed",
                      option.featured
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {option.description}
                  </p>
                </Link>
              </DialogClose>
            ))}
          </div>
        </div>

        {/* Decorative gradient bar */}
        <div className="h-1 w-full bg-linear-to-r from-primary via-secondary to-accent" />
      </DialogContent>
    </Dialog>
  )
}
