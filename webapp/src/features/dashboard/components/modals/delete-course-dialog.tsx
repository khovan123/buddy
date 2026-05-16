"use client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this course? This action cannot be
            undone and may affect related tutorials and resources.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
