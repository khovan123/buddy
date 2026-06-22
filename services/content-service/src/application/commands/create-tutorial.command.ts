/**
 * CreateTutorialCommand - CQRS Command để tạo Tutorial.
 *
 * Workflow (New - Presigned URL):
 * 1. Validate majorId/courseId và resource/collection integrity
 * 2. Tạo Tutorial metadata với status PROCESSING
 * 3. Gọi upload-service để lấy presigned URL
 * 4. Return metadata + presigned URL cho client upload
 */
export class CreateTutorialCommand {
  constructor(
    public readonly userId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly hightlights: string[],
    public readonly majorId: string,
    public readonly courseId: string,
    public readonly price: number,
    public readonly discountBundle: number,
    public readonly fileName: string,
    public readonly fileSizeBytes: number,
    public readonly videoDurationSeconds: number,
    public readonly resourceIds?: string[],
    public readonly collectionId?: string,
    public readonly collectionIds?: string[],
    public readonly steps?: Array<{
      title: string;
      resources: Array<{ resourceId: string; instructionNote: string }>;
    }>,
    public readonly correlationId?: string,
  ) {}
}
