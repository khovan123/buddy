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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Major</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this major? This action cannot be
            undone and may affect related courses.
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
