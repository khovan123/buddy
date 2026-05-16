"use client"

import { useCallback, useMemo, useState } from "react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { GraduationCap, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Major } from "@/features/content/types"

const SEMESTERS = [
  { value: "all", label: "All Semesters" },
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
  { value: "3", label: "Semester 3" },
  { value: "4", label: "Semester 4" },
  { value: "5", label: "Semester 5" },
  { value: "6", label: "Semester 6" },
] as const

/** All-option sentinel used by the combobox (empty string clears the URL param). */
const ALL_MAJORS_OPTION = { id: "", name: "All Majors" } as const

interface ExploreFilterBarProps {
  majors: Major[]
}

export function ExploreFilterBar({ majors }: ExploreFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const semester = searchParams.get("semester") ?? ""
  const majorId = searchParams.get("majorId") ?? ""
  const search = searchParams.get("search") ?? ""

  /** Combobox needs a flat array including the "All" sentinel. */
  const majorOptions = useMemo(() => [ALL_MAJORS_OPTION, ...majors], [majors])

  /** Local search text inside the combobox popover. */
  const [majorSearch, setMajorSearch] = useState("")

  const selectedMajorName =
    majors.find((m) => m.id === majorId)?.name ?? "All Majors"

  const updateParams = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      // Always reset page to 1 when filters change
      next.delete("page")
      const qs = next.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const value = (formData.get("search") as string) ?? ""
      updateParams("search", value.trim())
    },
    [updateParams]
  )

  const hasFilters = semester || majorId || search

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* ── Semester Select ── */}
        <Select
          value={semester || "all"}
          onValueChange={(val) =>
            updateParams("semester", val === "all" ? "" : val)
          }
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-auto min-w-36 gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 text-xs font-medium shadow-xs backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80 focus-visible:border-primary/40 focus-visible:bg-card/80"
          >
            <SelectValue placeholder="All Semesters" />
          </SelectTrigger>
          <SelectContent position="popper" className="rounded-xl">
            <SelectGroup>
              {SEMESTERS.map((s) => (
                <SelectItem
                  key={s.value}
                  value={s.value}
                  className="rounded-lg text-xs"
                >
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* ── Major Combobox (searchable) ── */}
        <Combobox
          value={majorId}
          onValueChange={(val) => {
            updateParams("majorId", val ?? "")
            setMajorSearch("")
          }}
          inputValue={majorSearch}
          onInputValueChange={(val, details) => {
            // Only update search text when the user actually types or clears
            if (
              details?.reason === "input-change" ||
              details?.reason === "input-clear"
            ) {
              setMajorSearch(val)
            }
          }}
        >
          <ComboboxInput
            placeholder={selectedMajorName}
            className="h-8 max-w-56 min-w-44 rounded-lg border border-border/60 bg-card/50 text-xs shadow-xs backdrop-blur-sm transition-all focus-within:border-primary/40 focus-within:bg-card/80 hover:border-primary/30 hover:bg-card/80 [&_input]:text-xs [&_input]:placeholder:text-foreground/70"
            onBlur={() => setMajorSearch("")} // Clear search text when losing focus so placeholder (selected name) shows
          />
          <ComboboxContent className="rounded-xl">
            <ComboboxList>
              {(() => {
                const filtered = majorOptions.filter((m) =>
                  m.name.toLowerCase().includes(majorSearch.toLowerCase())
                )

                if (filtered.length === 0) {
                  return (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No majors found
                    </div>
                  )
                }

                return filtered.map((m) => (
                  <ComboboxItem
                    key={m.id || "__all__"}
                    value={m.id}
                    className="rounded-lg text-xs"
                  >
                    {m.id ? (
                      <GraduationCap className="size-3.5 shrink-0 text-muted-foreground/60" />
                    ) : null}
                    {m.name}
                  </ComboboxItem>
                ))
              })()}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {/* ── Clear All ── */}
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              router.replace(pathname, { scroll: false })
            }}
          >
            <X className="size-3" />
            Clear
          </Button>
        ) : null}
      </div>

      {/* ── Search (compact) ── */}
      <form onSubmit={handleSearch} className="relative w-full sm:max-w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="Search..."
          className="h-8 rounded-lg border-border/60 bg-card/50 pl-8 text-xs shadow-xs backdrop-blur-sm placeholder:text-muted-foreground/50"
        />
      </form>
    </div>
  )
}
