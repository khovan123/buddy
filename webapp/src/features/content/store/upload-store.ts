import { create } from "zustand"

// ── Types ────────────────────────────────────────────────────

export type UploadFileStatus = "pending" | "uploading" | "completed" | "failed"

export interface UploadFileItem {
  /** Unique ID — use fileId from presigned URL response */
  id: string
  /** Display name */
  fileName: string
  /** File size in bytes */
  fileSizeBytes: number
  /** S3 presigned URL */
  uploadUrl: string
  /** The actual File object from the browser */
  file: File
  /** MIME type */
  mimeType?: string
  /** Upload progress 0-100 */
  progress: number
  /** Current status */
  status: UploadFileStatus
  /** Error message if failed */
  error?: string
  /** Resource title this file belongs to */
  resourceTitle: string
}

export interface UploadBatch {
  /** Resource ID returned from the API */
  resourceId: string
  /** Resource title for display */
  resourceTitle: string
  /** Files in this batch */
  files: UploadFileItem[]
  /** Timestamp when batch was created */
  createdAt: number
}

interface UploadStore {
  /** All upload batches (most recent first) */
  batches: UploadBatch[]
  /** Whether the panel is visible */
  isOpen: boolean
  /** Whether the panel is collapsed (minimized) */
  isMinimized: boolean

  // Actions
  addBatch: (batch: UploadBatch) => void
  updateFileProgress: (
    resourceId: string,
    fileId: string,
    progress: number
  ) => void
  updateFileStatus: (
    resourceId: string,
    fileId: string,
    status: UploadFileStatus,
    error?: string
  ) => void
  /** Reset a single failed file back to pending */
  retryFile: (resourceId: string, fileId: string) => void
  /** Reset all failed files in a batch back to pending */
  retryBatchFailed: (resourceId: string) => void
  removeBatch: (resourceId: string) => void
  clearCompleted: () => void
  toggleOpen: () => void
  toggleMinimized: () => void
  setOpen: (open: boolean) => void
}

// ── Store ────────────────────────────────────────────────────

export const useUploadStore = create<UploadStore>((set) => ({
  batches: [],
  isOpen: false,
  isMinimized: false,

  addBatch: (batch) =>
    set((state) => ({
      batches: [batch, ...state.batches],
      isOpen: true,
      isMinimized: false,
    })),

  updateFileProgress: (resourceId, fileId, progress) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.resourceId === resourceId
          ? {
              ...b,
              files: b.files.map((f) =>
                f.id === fileId ? { ...f, progress } : f
              ),
            }
          : b
      ),
    })),

  updateFileStatus: (resourceId, fileId, status, error) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.resourceId === resourceId
          ? {
              ...b,
              files: b.files.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status,
                      error,
                      progress: status === "completed" ? 100 : f.progress,
                    }
                  : f
              ),
            }
          : b
      ),
    })),

  retryFile: (resourceId, fileId) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.resourceId === resourceId
          ? {
              ...b,
              files: b.files.map((f) =>
                f.id === fileId
                  ? { ...f, status: "pending" as const, progress: 0, error: undefined }
                  : f
              ),
            }
          : b
      ),
    })),

  retryBatchFailed: (resourceId) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.resourceId === resourceId
          ? {
              ...b,
              files: b.files.map((f) =>
                f.status === "failed"
                  ? { ...f, status: "pending" as const, progress: 0, error: undefined }
                  : f
              ),
            }
          : b
      ),
    })),

  removeBatch: (resourceId) =>
    set((state) => {
      const newBatches = state.batches.filter(
        (b) => b.resourceId !== resourceId
      )
      return {
        batches: newBatches,
        isOpen: newBatches.length > 0 ? state.isOpen : false,
      }
    }),

  clearCompleted: () =>
    set((state) => {
      const newBatches = state.batches.filter((b) =>
        b.files.some((f) => f.status !== "completed" && f.status !== "failed")
      )
      return {
        batches: newBatches,
        isOpen: newBatches.length > 0 ? state.isOpen : false,
      }
    }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleMinimized: () => set((state) => ({ isMinimized: !state.isMinimized })),
  setOpen: (open) => set({ isOpen: open }),
}))

// ── Upload Engine ────────────────────────────────────────────

/**
 * Upload a single file to S3 via presigned URL using XMLHttpRequest
 * for real progress tracking. Uses PUT method which is standard for
 * S3 presigned URL uploads.
 */
function uploadFileWithProgress(
  resourceId: string,
  item: UploadFileItem
): {
  promise: Promise<void>
  abort: () => void
} {
  const store = useUploadStore.getState()
  const xhr = new XMLHttpRequest()

  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100)
        store.updateFileProgress(resourceId, item.id, progress)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        store.updateFileStatus(resourceId, item.id, "completed")
        resolve()
      } else {
        const error = `Upload failed with status ${xhr.status}`
        store.updateFileStatus(resourceId, item.id, "failed", error)
        reject(new Error(error))
      }
    })

    xhr.addEventListener("error", () => {
      store.updateFileStatus(resourceId, item.id, "failed", "Network error")
      reject(new Error("Network error"))
    })

    xhr.addEventListener("abort", () => {
      store.updateFileStatus(resourceId, item.id, "failed", "Upload cancelled")
      reject(new Error("Cancelled"))
    })

    xhr.open("PUT", item.uploadUrl)
    if (item.mimeType) {
      xhr.setRequestHeader("Content-Type", item.mimeType)
    }
    xhr.send(item.file)
  })

  return {
    promise,
    abort: () => xhr.abort(),
  }
}

/**
 * Start uploading all files in a batch. Files are uploaded
 * concurrently (max 3 at a time) for better performance.
 */
export async function startBatchUpload(batch: UploadBatch) {
  const store = useUploadStore.getState()
  const concurrency = 3
  const queue = [...batch.files]

  async function processNext() {
    const item = queue.shift()
    if (!item) {
      return
    }

    store.updateFileStatus(batch.resourceId, item.id, "uploading")

    try {
      const { promise } = uploadFileWithProgress(batch.resourceId, item)
      await promise
    } catch {
      // Error already handled in uploadFileWithProgress
    }

    await processNext()
  }

  // Start up to `concurrency` concurrent upload workers
  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => processNext()
  )

  await Promise.allSettled(workers)
}

/**
 * Retry uploading a single failed file.
 * Resets its status to pending, then kicks off the upload.
 */
export async function retryFileUpload(
  resourceId: string,
  fileId: string
) {
  const store = useUploadStore.getState()
  store.retryFile(resourceId, fileId)

  // Find the file item from the store after reset
  const batch = store.batches.find((b) => b.resourceId === resourceId)
  const item = batch?.files.find((f) => f.id === fileId)
  if (!item) {
    return
  }

  store.updateFileStatus(resourceId, fileId, "uploading")

  try {
    const { promise } = uploadFileWithProgress(resourceId, item)
    await promise
  } catch {
    // Error already handled in uploadFileWithProgress
  }
}

/**
 * Retry all failed files in a batch.
 * Resets them to pending then processes concurrently.
 */
export async function retryBatchFailedUploads(resourceId: string) {
  const store = useUploadStore.getState()
  store.retryBatchFailed(resourceId)

  // Re-read store to get fresh state after reset
  const batch = useUploadStore
    .getState()
    .batches.find((b) => b.resourceId === resourceId)
  if (!batch) {
    return
  }

  const failedItems = batch.files.filter((f) => f.status === "pending")
  if (failedItems.length === 0) {
    return
  }

  const concurrency = 3
  const queue = [...failedItems]

  async function processNext() {
    const item = queue.shift()
    if (!item) {
      return
    }

    store.updateFileStatus(resourceId, item.id, "uploading")

    try {
      const { promise } = uploadFileWithProgress(resourceId, item)
      await promise
    } catch {
      // Error already handled in uploadFileWithProgress
    }

    await processNext()
  }

  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => processNext()
  )

  await Promise.allSettled(workers)
}
