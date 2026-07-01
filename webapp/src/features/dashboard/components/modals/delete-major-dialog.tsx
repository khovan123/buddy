"use client"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteMajorMutation } from "@/features/content/services/content-api"
import { useI18n } from "@/i18n/language-provider"

interface DeleteMajorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string | null
}

export default function DeleteMajorDialog({
  open,
  onOpenChange,
  id,
}: DeleteMajorDialogProps) {
  const { t } = useI18n()
  const [deleteMajor, { isLoading }] = useDeleteMajorMutation()

  const handleConfirm = async () => {
    if (!id) {
      return
    }
    try {
      await deleteMajor(id).unwrap()
      toast.success(t("dashboard.deleteMajor.success"))
      onOpenChange(false)
    } catch (error) {
      toast.error(t("dashboard.deleteMajor.error"))
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title={t("dashboard.deleteMajor.title")}
      description={t("dashboard.deleteMajor.description")}
      confirmLabel={t("dashboard.deleteMajor.confirm")}
      loading={isLoading}
      onConfirm={handleConfirm}
    />
  )
}
