"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateCareerMutation,
  useUpdateCareerMutation,
  type CareerItem,
} from "@/features/user/services/user-api"

const careerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().optional(),
})

type CareerFormValues = z.infer<typeof careerSchema>

interface CareerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  career?: CareerItem
}

export default function CareerModal({
  open,
  onOpenChange,
  career,
}: CareerModalProps) {
  const isEditing = !!career
  const [createCareer, { isLoading: isCreating }] = useCreateCareerMutation()
  const [updateCareer, { isLoading: isUpdating }] = useUpdateCareerMutation()
  const isSaving = isCreating || isUpdating

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CareerFormValues>({
    resolver: zodResolver(careerSchema),
    values: career || {
      name: "",
      description: "",
      status: "ACTIVE",
    },
  })

  const onSubmit = async (data: CareerFormValues) => {
    try {
      if (isEditing && career) {
        await updateCareer({ id: career.id, body: data }).unwrap()
        toast.success("Career updated.")
      } else {
        await createCareer(data).unwrap()
        toast.success("Career created.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error("We could not save this career.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Career" : "Create Career"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modify the career details below."
                : "Add a new career to the platform."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                placeholder="Software Engineer"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                rows={3}
                {...register("description")}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
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
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="DELETED">Deleted</SelectItem>
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
