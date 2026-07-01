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
import {
  useCreateSkillMutation,
  useUpdateSkillMutation,
  type CareerItem,
  type SkillItem,
} from "@/features/user/services/user-api"
import { useI18n } from "@/i18n/language-provider"

const skillSchema = z.object({
  name: z.string().min(1, "Name is required"),
  careerId: z.string().min(1, "Career is required"),
  status: z.string().optional(),
})

type SkillFormValues = z.infer<typeof skillSchema>

interface SkillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill?: SkillItem
  careers: CareerItem[]
}

export default function SkillModal({
  open,
  onOpenChange,
  skill,
  careers,
}: SkillModalProps) {
  const { t } = useI18n()
  const isEditing = !!skill
  const [createSkill, { isLoading: isCreating }] = useCreateSkillMutation()
  const [updateSkill, { isLoading: isUpdating }] = useUpdateSkillMutation()
  const isSaving = isCreating || isUpdating

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    values: skill || {
      name: "",
      careerId: "",
      status: "ACTIVE",
    },
  })

  const onSubmit = async (data: SkillFormValues) => {
    try {
      if (isEditing && skill) {
        await updateSkill({ id: skill.id, body: data }).unwrap()
        toast.success(t("dashboard.skillModal.updated"))
      } else {
        await createSkill(data).unwrap()
        toast.success(t("dashboard.skillModal.created"))
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(t("dashboard.skillModal.saveError"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? t("dashboard.skillModal.editTitle")
                : t("dashboard.skillModal.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? t("dashboard.skillModal.editDescription")
                : t("dashboard.skillModal.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="name">{t("common.name")}</FieldLabel>
              <Input id="name" placeholder="ReactJS" {...register("name")} />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel>{t("dashboard.skillModal.relatedCareer")}</FieldLabel>
              <Controller
                name="careerId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("dashboard.skillModal.selectCareer")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {careers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.careerId && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.careerId.message}
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
