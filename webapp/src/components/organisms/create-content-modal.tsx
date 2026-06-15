"use client"

import { useRouter } from "next/navigation"

import { FileText, FolderOpen, Video } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from "@/i18n/language-provider"
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
    titleKey: "createContent.resource" as const,
    descriptionKey: "createContent.resourceDescription" as const,
    iconBg: "bg-primary/10 text-primary",
    featured: false,
  },
  {
    type: "tutorial" as const,
    href: "/home/tutorials/create",
    icon: Video,
    titleKey: "createContent.tutorial" as const,
    descriptionKey: "createContent.tutorialDescription" as const,
    iconBg: "bg-primary-foreground/20 text-primary-foreground",
    featured: true,
  },
  {
    type: "collection" as const,
    href: "/home/collections/create",
    icon: FolderOpen,
    titleKey: "createContent.collection" as const,
    descriptionKey: "createContent.collectionDescription" as const,
    iconBg: "bg-secondary text-secondary-foreground",
    featured: false,
  },
]

export function CreateContentModal({
  open,
  onOpenChange,
}: CreateContentModalProps) {
  const router = useRouter()
  const { t } = useI18n()

  const handleSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)

    globalThis.setTimeout(() => {
      if (
        typeof globalThis.location !== "undefined" &&
        globalThis.location.pathname !== href
      ) {
        globalThis.location.assign(href)
      }
    }, 150)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-0 p-0 sm:max-w-2xl sm:rounded-2xl">
        <div className="p-8 md:p-10">
          <DialogHeader className="mb-8 space-y-2">
            <DialogTitle className="text-2xl font-extrabold tracking-tight md:text-3xl">
              {t("createContent.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("createContent.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Option Cards */}
          <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 md:grid-cols-3">
            {contentOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => handleSelect(option.href)}
                className={cn(
                  "group relative flex h-full flex-col items-start rounded-xl p-5 text-left transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
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
                <h3 className="text-lg font-bold">{t(option.titleKey)}</h3>
                <p
                  className={cn(
                    "mt-1 text-xs leading-relaxed",
                    option.featured
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {t(option.descriptionKey)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Decorative gradient bar */}
        <div className="h-1 w-full bg-linear-to-r from-primary via-secondary to-accent" />
      </DialogContent>
    </Dialog>
  )
}
