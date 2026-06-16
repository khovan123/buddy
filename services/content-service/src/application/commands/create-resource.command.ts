import type { LearningFit } from '../../domain/entities/learning-fit';

/**
 * CreateResourceCommand - CQRS Command để tạo Resource.
 *
 * Workflow:
 * 1. Validate majorId/courseId
 * 2. Handler tạo Resource metadata với status PENDING
 * 3. Gọi upload-service để lấy presigned URL
 * 4. Return metadata + presigned URL cho client upload
 */
export class CreateResourceCommand {
  constructor(
    public readonly userId: string,
    public readonly title: string,
    public readonly summary: string,
    public readonly hightlights: string[],
    public readonly majorId: string,
    public readonly courseId: string,
    public readonly price: number,
    public readonly files: Array<{
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
    }>,
    public readonly thumbnailBase64?: string,
    public readonly collectionId?: string,
    public readonly correlationId?: string,
    public readonly learningFit?: LearningFit,
  ) {}
}
