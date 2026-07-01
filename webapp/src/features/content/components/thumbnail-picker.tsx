"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"

import Image from "next/image"

import { Eye, ImageIcon, Trash2, Upload } from "lucide-react"

import { ResourceCard } from "@/components/molecules/resource-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ThumbnailPickerProps {
  // Can be a File, a URL string, or null
  value?: File | string | null
  onChange: (file: File | null) => void
  labelContext?: string // e.g. "Resource" or "Collection"
  error?: string
}

export function ThumbnailPicker({
  value,
  onChange,
  labelContext = "Item",
  error,
}: ThumbnailPickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewSource = useMemo(() => {
    if (!value) {
      return null
    }

    if (typeof value === "string") {
      return value
    }

    return URL.createObjectURL(value)
  }, [value])

  React.useEffect(() => {
    if (!(value instanceof File) || !previewSource) {
      return
    }

    return () => {
      URL.revokeObjectURL(previewSource)
    }
  }, [previewSource, value])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith("image/")) {
        onChange(file)
      }
    },
    [onChange]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(file)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleChangeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    inputRef.current?.click()
  }

  return (
    <div className="flex w-1/2 flex-col items-center justify-center space-y-2">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      <div
        onClick={() => !previewSource && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition-all duration-200 ${
          previewSource
            ? "border-transparent bg-muted/20"
            : isDragging
              ? "border-primary bg-primary/5"
              : "cursor-pointer border-dashed border-border hover:border-primary/50 hover:bg-muted/50"
        } ${error ? "border-destructive/50 hover:border-destructive" : ""}`}
      >
        {previewSource ? (
          <>
            <Image
              src={previewSource}
              alt="Thumbnail preview"
              fill
              className="object-cover"
              unoptimized
            />
            {/* Overlay Gradient on Hover */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity duration-200 hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleChangeClick}
                className="bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
              >
                <Upload className="mr-2 size-4" />
                Change
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                className="bg-red-500/80 text-white backdrop-blur-md hover:bg-red-600/90"
              >
                <Trash2 className="mr-2 size-4" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center p-6 text-center text-muted-foreground">
            <div
              className={`mb-3 flex size-12 items-center justify-center rounded-full bg-muted transition-transform duration-200 ${isDragging ? "scale-110 bg-primary/10 text-primary" : ""}`}
            >
              <ImageIcon
                className={`size-6 ${isDragging ? "text-primary" : "text-muted-foreground/60"}`}
              />
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">
              Select a thumbnail
            </p>
            <p className="text-xs">
              Drag and drop an image here or click to browse
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Use JPG, PNG, or WEBP formats (MAX 2MB).
          </p>
        )}

        {previewSource && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
              >
                <Eye className="mr-1.5 size-3.5" />
                Preview on card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Live Preview</DialogTitle>
                <DialogDescription>
                  Preview how your thumbnail will look in a typical card layout.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-4">
                {/* Genuine Preview Component */}
                <div className="w-76">
                  <ResourceCard
                    resource={{
                      id: "preview-id",
                      category: labelContext,
                      title: `[Name of the ${labelContext} will appear here]`,
                      rating: "5.0",
                      reviews: "1,234",
                      price: "free",
                      href: "#",
                      thumbnailUrl: previewSource || undefined,
                      author: {
                        name: "By You",
                      },
                    }}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
