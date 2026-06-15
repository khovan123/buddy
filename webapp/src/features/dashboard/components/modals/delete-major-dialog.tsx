"use client"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteMajorMutation } from "@/features/content/services/content-api"

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
  const [deleteMajor, { isLoading }] = useDeleteMajorMutation()

  const handleConfirm = async () => {
    if (!id) {
      return
    }
    try {
      await deleteMajor(id).unwrap()
      toast.success("Major deleted successfully")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to delete major")
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title="Delete major?"
      description="This action cannot be undone and may affect related courses."
      confirmLabel="Delete"
      loading={isLoading}
      onConfirm={handleConfirm}
    />
  )
}
