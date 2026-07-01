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
  useCreateMajorMutation,
  useUpdateMajorMutation,
} from "@/features/content/services/content-api"
import { Major, MajorStatus } from "@/features/content/types"
import { useI18n } from "@/i18n/language-provider"

const majorSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.nativeEnum(MajorStatus).optional(),
})

type MajorFormValues = z.infer<typeof majorSchema>

interface MajorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  major?: Major
}

export default function MajorModal({
  open,
  onOpenChange,
  major,
}: MajorModalProps) {
  const { t } = useI18n()
  const isEditing = !!major
  const [createMajor, { isLoading: isCreating }] = useCreateMajorMutation()
  const [updateMajor, { isLoading: isUpdating }] = useUpdateMajorMutation()
  const isSaving = isCreating || isUpdating

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MajorFormValues>({
    resolver: zodResolver(majorSchema),
    values: major || {
      code: "",
      name: "",
      description: "",
      status: MajorStatus.ACTIVE,
    },
  })

  const onSubmit = async (data: MajorFormValues) => {
    try {
      if (isEditing && major) {
        await updateMajor({ id: major.id, body: data }).unwrap()
        toast.success(t("dashboard.majorModal.updated"))
      } else {
        await createMajor(data).unwrap()
        toast.success(t("dashboard.majorModal.created"))
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(t("dashboard.majorModal.saveError"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? t("dashboard.majorModal.editTitle")
                : t("dashboard.majorModal.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? t("dashboard.majorModal.editDescription")
                : t("dashboard.majorModal.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="code">{t("common.code")}</FieldLabel>
              <Input id="code" placeholder="e.g. SE" {...register("code")} />
              {errors.code && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.code.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="name">{t("common.name")}</FieldLabel>
              <Input
                id="name"
                placeholder="Software Engineering"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="description">
                {t("common.descriptionLabel")}
              </FieldLabel>
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
                <FieldLabel>{t("common.status")}</FieldLabel>
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
                        <SelectItem value={MajorStatus.ACTIVE}>
                          Active
                        </SelectItem>
                        <SelectItem value={MajorStatus.INACTIVE}>
                          Inactive
                        </SelectItem>
                        <SelectItem value={MajorStatus.DELETED}>
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
