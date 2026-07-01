"use client"

import { startTransition, useCallback, useMemo, useRef, useState } from "react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { BookOpen, GraduationCap, Search, X } from "lucide-react"

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
import type { Course, Major } from "@/features/content/types"
import { useI18n } from "@/i18n/language-provider"

interface ExploreFilterBarProps {
  majors: Major[]
  courses: Course[]
}

export function ExploreFilterBar({ majors, courses }: ExploreFilterBarProps) {
  const SEARCH_DEBOUNCE_MS = 30_000
  const { t } = useI18n()
  const copy = {
    semesters: [
      { value: "all", label: t("explore.filter.allSemesters") },
      { value: "1", label: t("explore.filter.semester1") },
      { value: "2", label: t("explore.filter.semester2") },
      { value: "3", label: t("explore.filter.semester3") },
      { value: "4", label: t("explore.filter.semester4") },
      { value: "5", label: t("explore.filter.semester5") },
      { value: "6", label: t("explore.filter.semester6") },
      { value: "7", label: t("explore.filter.semester7") },
      { value: "8", label: t("explore.filter.semester8") },
      { value: "9", label: t("explore.filter.semester9") },
    ],
    sortOptions: [
      { value: "newest", label: t("explore.filter.newest") },
      { value: "popular", label: t("explore.filter.popular") },
      { value: "rating", label: t("explore.filter.topRated") },
    ],
    allMajors: t("explore.filter.allMajors"),
    allCourses: t("explore.filter.allCourses"),
    noMajors: t("explore.filter.noMajors"),
    allContent: t("explore.filter.allContent"),
    verified: t("explore.filter.verified"),
    clear: t("explore.filter.clear"),
    searchPlaceholder: t("explore.filter.searchPlaceholder"),
    searchTitle: t("explore.filter.searchTitle"),
    searchHint: t("explore.filter.searchHint"),
    searchAction: t("explore.filter.searchAction"),
  }
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const semester = searchParams.get("semester") ?? ""
  const majorId = searchParams.get("majorId") ?? ""
  const courseId = searchParams.get("courseId") ?? ""
  const search = searchParams.get("search") ?? ""
  const verified = searchParams.get("verified") ?? ""
  const sort = searchParams.get("sort") ?? ""

  const allMajorsOption = useMemo(
    () => ({ id: "", name: copy.allMajors }),
    [copy.allMajors]
  )
  const allCoursesOption = useMemo(
    () => ({ id: "", name: copy.allCourses }),
    [copy.allCourses]
  )

  const courseOptions = useMemo(() => {
    const filteredCourses = courses.filter((course) => {
      const matchesMajor = majorId
        ? course.majorId === majorId || course.majorIds.includes(majorId)
        : true
      const matchesSemester = semester
        ? course.semester === Number(semester)
        : true

      return matchesMajor && matchesSemester
    })
    return [allCoursesOption, ...filteredCourses]
  }, [allCoursesOption, courses, majorId, semester])

  /** Local search text inside the combobox popover. */
  const [majorSearch, setMajorSearch] = useState("")
  const searchDebounceRef = useRef<ReturnType<
    typeof globalThis.setTimeout
  > | null>(null)

  const selectedMajorName =
    majors.find((m) => m.id === majorId)?.name ?? copy.allMajors
  const selectedCourseName =
    courseOptions.find((course) => course.id === courseId)?.name ??
    copy.allCourses

  const navigateWithParams = useCallback(
    (next: URLSearchParams) => {
      next.delete("page")
      const qs = next.toString()
      const href = `${pathname}${qs ? `?${qs}` : ""}`

      startTransition(() => {
        router.replace(href, { scroll: false })
        router.refresh()
      })
    },
    [pathname, router]
  )

  const updateParams = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      navigateWithParams(next)
    },
    [navigateWithParams, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (searchDebounceRef.current) {
        globalThis.clearTimeout(searchDebounceRef.current)
      }
      const formData = new FormData(e.currentTarget)
      const value = (formData.get("search") as string) ?? ""
      updateParams("search", value.trim())
    },
    [updateParams]
  )

  const hasFilters =
    semester || majorId || courseId || search || verified || sort

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* ── Semester Select ── */}
        <Select
          value={semester || "all"}
          onValueChange={(val) => {
            const next = new URLSearchParams(searchParams.toString())
            if (val === "all") {
              next.delete("semester")
            } else {
              next.set("semester", val)
            }
            next.delete("courseId")
            navigateWithParams(next)
          }}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-auto min-w-36 gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 text-xs font-medium shadow-xs backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80 focus-visible:border-primary/40 focus-visible:bg-card/80"
          >
            <SelectValue placeholder={copy.semesters[0].label} />
          </SelectTrigger>
          <SelectContent position="popper" className="rounded-xl">
            <SelectGroup>
              {copy.semesters.map((s) => (
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
            const next = new URLSearchParams(searchParams.toString())
            if (val) {
              next.set("majorId", val)
            } else {
              next.delete("majorId")
            }
            next.delete("courseId")
            navigateWithParams(next)
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
                const filtered = [allMajorsOption, ...majors].filter((m) =>
                  m.name.toLowerCase().includes(majorSearch.toLowerCase())
                )

                if (filtered.length === 0) {
                  return (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      {copy.noMajors}
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

        <Select
          value={courseId || "all"}
          onValueChange={(val) =>
            updateParams("courseId", val === "all" ? "" : val)
          }
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-auto min-w-44 gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 text-xs font-medium shadow-xs backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80 focus-visible:border-primary/40 focus-visible:bg-card/80"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <BookOpen className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{selectedCourseName}</span>
            </div>
          </SelectTrigger>
          <SelectContent position="popper" className="rounded-xl">
            <SelectGroup>
              {courseOptions.map((course) => (
                <SelectItem
                  key={course.id || "__all_courses__"}
                  value={course.id || "all"}
                  className="rounded-lg text-xs"
                >
                  {"code" in course
                    ? `${course.code} · ${course.name}`
                    : course.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* <Select
          value={verified || "all"}
          onValueChange={(val) =>
            updateParams("verified", val === "all" ? "" : val)
          }
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-auto min-w-34 gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 text-xs font-medium shadow-xs backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80 focus-visible:border-primary/40 focus-visible:bg-card/80"
          >
            <SelectValue placeholder={copy.allContent} />
          </SelectTrigger>
          <SelectContent position="popper" className="rounded-xl">
            <SelectGroup>
              <SelectItem value="all" className="rounded-lg text-xs">
                {copy.allContent}
              </SelectItem>
              <SelectItem value="true" className="rounded-lg text-xs">
                {copy.verified}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select> */}

        <Select
          value={sort || "newest"}
          onValueChange={(val) =>
            updateParams("sort", val === "newest" ? "" : val)
          }
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-auto min-w-32 gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 text-xs font-medium shadow-xs backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80 focus-visible:border-primary/40 focus-visible:bg-card/80"
          >
            <SelectValue placeholder={copy.sortOptions[0].label} />
          </SelectTrigger>
          <SelectContent position="popper" className="rounded-xl">
            <SelectGroup>
              {copy.sortOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* ── Clear All ── */}
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              startTransition(() => {
                router.replace(pathname, { scroll: false })
                router.refresh()
              })
            }}
          >
            <X className="size-3" />
            {copy.clear}
          </Button>
        ) : null}
      </div>

      {/* ── Search ── */}
      <form key={search} onSubmit={handleSearch} className="w-full sm:max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-card/95 to-accent/8 p-3 shadow-[0_18px_50px_-28px_color-mix(in_oklch,var(--primary)_45%,transparent)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-linear-to-l from-primary/8 to-transparent" />
          <div className="relative space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                {/* <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-primary/70" /> */}
                <Input
                  name="search"
                  defaultValue={search}
                  onChange={(e) => {
                    if (searchDebounceRef.current) {
                      globalThis.clearTimeout(searchDebounceRef.current)
                    }
                    const value = e.target.value
                    searchDebounceRef.current = globalThis.setTimeout(() => {
                      updateParams("search", value.trim())
                    }, SEARCH_DEBOUNCE_MS)
                  }}
                  placeholder={copy.searchPlaceholder}
                  className="h-11 rounded-xl border-primary/15 bg-background/88 text-sm shadow-[inset_0_1px_0_color-mix(in_oklch,var(--background)_80%,transparent)] placeholder:text-muted-foreground/55 focus-visible:border-primary/35 focus-visible:ring-primary/15"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="rounded-xl px-5 shadow-[0_14px_32px_-20px_color-mix(in_oklch,var(--primary)_75%,transparent)]"
              >
                <Search className="size-4" />
                {copy.searchAction}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
