"use client"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteCourseMutation } from "@/features/content/services/content-api"
import { useI18n } from "@/i18n/language-provider"

interface DeleteCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string | null
}

export default function DeleteCourseDialog({
  open,
  onOpenChange,
  id,
}: DeleteCourseDialogProps) {
  const { t } = useI18n()
  const [deleteCourse, { isLoading }] = useDeleteCourseMutation()

  const handleConfirm = async () => {
    if (!id) {
      return
    }
    try {
      await deleteCourse(id).unwrap()
      toast.success(t("dashboard.deleteCourse.success"))
      onOpenChange(false)
    } catch (error) {
      toast.error(t("dashboard.deleteCourse.error"))
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title={t("dashboard.deleteCourse.title")}
      description={t("dashboard.deleteCourse.description")}
      confirmLabel={t("dashboard.deleteCourse.confirm")}
      loading={isLoading}
      onConfirm={handleConfirm}
    />
  )
}
