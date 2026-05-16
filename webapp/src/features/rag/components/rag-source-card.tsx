"use client"

import Link from "next/link"

import { BookOpen, FileText } from "lucide-react"

import { cn } from "@/lib/utils"

import type { RAGSource } from "../types"

function getContentHref(source: RAGSource): string {
  switch (source.itemType) {
    case "RESOURCE":
      return `/home/resources/${source.slug}`
    case "TUTORIAL":
      return `/home/tutorials/${source.slug}`
    default:
      return `/home/resources/${source.slug}`
  }
}

interface RAGSourceCardProps {
  source: RAGSource
}

export function RAGSourceCard({ source }: RAGSourceCardProps) {
  const isTutorial = source.itemType === "TUTORIAL"

  return (
    <Link
      href={getContentHref(source)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl border border-border/40 bg-background/50 p-4 transition-all duration-300",
          "hover:-translate-y-0.5 hover:bg-background hover:shadow-soft hover:ring-1 hover:ring-primary/20"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground/80">
            {isTutorial ? (
              <BookOpen className="size-3.5" />
            ) : (
              <FileText className="size-3.5" />
            )}
            <span className="text-2xs font-semibold tracking-widest uppercase">
              {isTutorial ? "Tutorial" : "Resource"}
            </span>
          </div>
          <div className="flex items-center text-2xs font-medium text-primary/70">
            {Math.round(source.score * 100)}% match
          </div>
        </div>

        <div>
          <h4 className="line-clamp-1 text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {source.title}
          </h4>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/70">
            {source.chunkText}
          </p>
        </div>
      </div>
    </Link>
  )
}
