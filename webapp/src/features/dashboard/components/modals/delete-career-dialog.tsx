"use client"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteCareerMutation } from "@/features/user/services/user-api"
import { useI18n } from "@/i18n/language-provider"

interface DeleteCareerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string | null
}

export default function DeleteCareerDialog({
  open,
  onOpenChange,
  id,
}: DeleteCareerDialogProps) {
  const { t } = useI18n()
  const [deleteCareer, { isLoading }] = useDeleteCareerMutation()

  const handleDelete = async () => {
    if (!id) {
      return
    }
    try {
      await deleteCareer(id).unwrap()
      toast.success(t("dashboard.deleteCareer.success"))
      onOpenChange(false)
    } catch {
      toast.error(t("dashboard.deleteCareer.error"))
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title={t("dashboard.deleteCareer.title")}
      description={t("dashboard.deleteCareer.description")}
      confirmLabel={t("dashboard.deleteCareer.confirm")}
      loading={isLoading}
      onConfirm={handleDelete}
    />
  )
}
