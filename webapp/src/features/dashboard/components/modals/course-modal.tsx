"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
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

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    values: course || {
      code: "",
      name: "",
      credits: 3,
      semester: 1,
      isCompulsory: true,
      majorId: "",
      status: CourseStatus.ACTIVE,
    },
  })

  const onSubmit = async (data: CourseFormValues) => {
    try {
      if (isEditing && course) {
        await updateCourse({ id: course.id, body: data }).unwrap()
        toast.success("Course updated successfully")
      } else {
        await createCourse(data).unwrap()
        toast.success("Course created successfully")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to save course")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
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
              <FieldLabel htmlFor="majorId">Major</FieldLabel>
              <Controller
                name="majorId"
                control={control}
                render={({ field }) => (
                  <Combobox value={field.value} onValueChange={field.onChange}>
                    <div ref={majorAnchor}>
                      <ComboboxInput placeholder="Select Major..." />
                    </div>
                    <ComboboxContent anchor={majorAnchor} align="start">
                      <ComboboxList>
                        {/* <ComboboxEmpty>No major found.</ComboboxEmpty> */}
                        {majors.map((m) => (
                          <ComboboxItem key={m.id} value={m.id}>
                            {m.name} ({m.code})
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              />
              {errors.majorId && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.majorId.message}
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
