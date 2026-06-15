"use client"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteSkillMutation } from "@/features/user/services/user-api"

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
  const [deleteSkill, { isLoading }] = useDeleteSkillMutation()

  const handleDelete = async () => {
    if (!id) {
      return
    }
    try {
      await deleteSkill(id).unwrap()
      toast.success("Skill deleted.")
      onOpenChange(false)
    } catch {
      toast.error("We could not delete this skill.")
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title="Delete skill?"
      description="This action cannot be undone. This will permanently delete the skill."
      confirmLabel="Delete"
      loading={isLoading}
      onConfirm={handleDelete}
    />
  )
}
