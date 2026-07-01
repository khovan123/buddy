"use client"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteSkillMutation } from "@/features/user/services/user-api"
import { useI18n } from "@/i18n/language-provider"

interface DeleteSkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string | null
}

export default function DeleteSkillDialog({
  open,
  onOpenChange,
  id,
}: DeleteSkillDialogProps) {
  const { t } = useI18n()
  const [deleteSkill, { isLoading }] = useDeleteSkillMutation()

  const handleDelete = async () => {
    if (!id) {
      return
    }
    try {
      await deleteSkill(id).unwrap()
      toast.success(t("dashboard.deleteSkill.success"))
      onOpenChange(false)
    } catch {
      toast.error(t("dashboard.deleteSkill.error"))
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title={t("dashboard.deleteSkill.title")}
      description={t("dashboard.deleteSkill.description")}
      confirmLabel={t("dashboard.deleteSkill.confirm")}
      loading={isLoading}
      onConfirm={handleDelete}
    />
  )
}
