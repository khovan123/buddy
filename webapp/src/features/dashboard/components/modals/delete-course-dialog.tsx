"use client"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteCourseMutation } from "@/features/content/services/content-api"

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
  const [deleteCourse, { isLoading }] = useDeleteCourseMutation()

  const handleConfirm = async () => {
    if (!id) {
      return
    }
    try {
      await deleteCourse(id).unwrap()
      toast.success("Course deleted successfully")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to delete course")
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="error"
      title="Delete course?"
      description="This action cannot be undone and may affect related tutorials and resources."
      confirmLabel="Delete"
      loading={isLoading}
      onConfirm={handleConfirm}
    />
  )
}
