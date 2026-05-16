/**
 * IContentValidationService - Domain Service Interface
 *
 * Xử lý logic validate: các Resource/Collection được add vào Tutorial/Collection
 * bắt buộc phải trùng majorId và courseId (không được mix lẫn lộn giữa các ngành/môn).
 */
export interface IContentValidationService {
  /**
   * Validate rằng tất cả items (resources hoặc collections) có cùng majorId và courseId
   * với target entity đang được tạo.
   *
   * @throws BadRequestException nếu có bất kỳ item nào không khớp majorId/courseId
   */
  validateTargetIntegrity(params: {
    majorId: string;
    courseId: string;
    resourceIds?: string[];
    collectionIds?: string[];
  }): Promise<void>;

  /**
   * Validate majorId tồn tại và active
   */
  validateMajorExists(majorId: string): Promise<void>;

  /**
   * Validate courseId tồn tại, active và thuộc majorId
   */
  validateCourseExists(courseId: string, majorId: string): Promise<void>;
}
