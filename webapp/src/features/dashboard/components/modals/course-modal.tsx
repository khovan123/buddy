"use client"

import { useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CourseFormValues, courseSchema } from "@/features/content/schema"
import {
  useCreateCourseMutation,
  useUpdateCourseMutation,
} from "@/features/content/services/content-api"
import { Course, CourseStatus, Major } from "@/features/content/types"

interface CourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: Course
  majors: Major[]
}

export default function CourseModal({
  open,
  onOpenChange,
  course,
  majors,
}: CourseModalProps) {
  const isEditing = !!course
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation()
  const [updateCourse, { isLoading: isUpdating }] = useUpdateCourseMutation()
  const isSaving = isCreating || isUpdating

  const majorAnchor = useComboboxAnchor()

  const [majorSearch, setMajorSearch] = useState("")

  const visibleMajors = useMemo(() => {
    const query = majorSearch.trim().toLowerCase()
    if (!query) {
      return majors
    }
    return majors.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.code.toLowerCase().includes(query)
    )
  }, [majors, majorSearch])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    values: course
      ? {
          code: course.code,
          name: course.name,
          credits: course.credits,
          semester: course.semester,
          isCompulsory: course.isCompulsory,
          majorIds: course.majorIds ?? (course.majorId ? [course.majorId] : []),
          status: course.status,
        }
      : {
          code: "",
          name: "",
          credits: 3,
          semester: 1,
          isCompulsory: true,
          majorIds: [],
          status: CourseStatus.ACTIVE,
        },
  })

  const onSubmit = async (data: CourseFormValues) => {
    try {
      if (isEditing && course) {
        await updateCourse({ id: course.id, body: data }).unwrap()
        toast.success("Course updated.")
      } else {
        await createCourse(data).unwrap()
        toast.success("Course created.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error("We could not save this course.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-106.25"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target && target.closest('[data-slot="combobox-content"]')) {
            e.preventDefault()
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as HTMLElement
          if (target && target.closest('[data-slot="combobox-content"]')) {
            e.preventDefault()
          }
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Course" : "Create Course"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modify the course details."
                : "Add a new course linked to a major."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="code">Code</FieldLabel>
              <Input id="code" placeholder="PRF192" {...register("code")} />
              {errors.code && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.code.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                placeholder="Programming Fundamentals"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="majorIds">Majors</FieldLabel>
              <Controller
                name="majorIds"
                control={control}
                render={({ field }) => {
                  const currentValues = field.value || []

                  return (
                    <Combobox
                      multiple
                      value={currentValues}
                      onValueChange={(val) => {
                        field.onChange(val)
                        setMajorSearch("")
                      }}
                      inputValue={majorSearch}
                      onInputValueChange={(val, details) => {
                        if (
                          details?.reason === "input-change" ||
                          details?.reason === "input-clear"
                        ) {
                          setMajorSearch(val)
                        }
                      }}
                    >
                      <div ref={majorAnchor}>
                        <ComboboxChips>
                          {currentValues.map((id) => {
                            const m = majors.find((major) => major.id === id)
                            return (
                              <ComboboxChip key={id}>
                                {m ? `${m.name} (${m.code})` : id}
                              </ComboboxChip>
                            )
                          })}
                          <ComboboxChipsInput
                            id="majorIds"
                            placeholder={currentValues.length === 0 ? "Select Majors..." : ""}
                            onBlur={() => setMajorSearch("")}
                          />
                        </ComboboxChips>
                      </div>
                      <ComboboxContent
                        anchor={majorAnchor}
                        align="start"
                        className="pointer-events-auto"
                        style={{ pointerEvents: "auto" }}
                      >
                        <ComboboxList>
                          {visibleMajors.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No majors found
                            </div>
                          ) : (
                            visibleMajors.map((m) => (
                              <ComboboxItem key={m.id} value={m.id}>
                                {m.name} ({m.code})
                              </ComboboxItem>
                            ))
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )
                }}
              />
              {errors.majorIds && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.majorIds.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="credits">Credits</FieldLabel>
              <Input
                id="credits"
                type="number"
                min={1}
                {...register("credits", { valueAsNumber: true })}
              />
              {errors.credits && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.credits.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="semester">Semester</FieldLabel>
              <Input
                id="semester"
                type="number"
                min={1}
                {...register("semester", { valueAsNumber: true })}
              />
              {errors.semester && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.semester.message}
                </p>
              )}
            </Field>

            <Field>
              <div className="flex items-center space-x-2 py-2">
                <Controller
                  name="isCompulsory"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isCompulsory"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <FieldLabel
                  htmlFor="isCompulsory"
                  className="mb-0 cursor-pointer font-normal"
                >
                  Yes, required for major
                </FieldLabel>
              </div>
            </Field>

            {isEditing && (
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CourseStatus.ACTIVE}>
                          Active
                        </SelectItem>
                        <SelectItem value={CourseStatus.HIDDEN}>
                          Hidden
                        </SelectItem>
                        <SelectItem value={CourseStatus.PENDING}>
                          Pending
                        </SelectItem>
                        <SelectItem value={CourseStatus.DELETED}>
                          Deleted
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.status.message}
                  </p>
                )}
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
