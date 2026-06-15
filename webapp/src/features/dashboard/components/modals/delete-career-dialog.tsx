"use client"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteCareerMutation } from "@/features/user/services/user-api"

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
  const [deleteCareer, { isLoading }] = useDeleteCareerMutation()

  const handleDelete = async () => {
    if (!id) {
      return
    }
    try {
      await deleteCareer(id).unwrap()
      toast.success("Career deleted successfully")
      onOpenChange(false)
    } catch {
      toast.error("Failed to delete career")
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title="Delete career?"
      description="This action cannot be undone and may break relationships elsewhere in the system."
      confirmLabel="Delete"
      loading={isLoading}
      onConfirm={handleDelete}
    />
  )
}
