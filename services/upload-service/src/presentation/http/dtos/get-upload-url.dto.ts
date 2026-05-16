import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/**
 * GetUploadUrlDto - DTO cho HTTP request lấy presigned upload URL.
 * Hỗ trợ cả Resource và Tutorial uploads.
 *
 * Query params:
 * - fileName (string): Tên file gốc
 * - fileSizeBytes (number): Kích thước file (bytes)
 * - uploadType (string): 'resource' hoặc 'tutorial'
 * - videoDurationSeconds (number, optional): Độ dài video (chỉ cho Tutorial)
 */
export class GetUploadUrlDto {
  /**
   * Tên file gốc (ví dụ: "document.pdf", "lecture-notes.docx")
   * Không quá 256 ký tự
   */
  @IsNotEmpty({ message: 'fileName không được để trống' })
  @IsString({ message: 'fileName phải là string' })
  @MaxLength(256, { message: 'fileName không quá 256 ký tự' })
  fileName!: string;

  /**
   * Kích thước file tính bằng bytes (phải > 0)
   */
  @IsNotEmpty({ message: 'fileSizeBytes không được để trống' })
  @IsNumber({}, { message: 'fileSizeBytes phải là số' })
  @IsPositive({ message: 'fileSizeBytes phải lớn hơn 0' })
  fileSizeBytes!: number;

  /**
   * Loại upload: 'resource' hoặc 'tutorial'
   */
  @IsNotEmpty({ message: 'uploadType không được để trống' })
  @IsString({ message: 'uploadType phải là string' })
  uploadType!: 'resource' | 'tutorial';

  /**
   * Độ dài video tính bằng giây (chỉ bắt buộc nếu uploadType='tutorial')
   */
  @IsOptional()
  @IsNumber({}, { message: 'videoDurationSeconds phải là số' })
  @IsPositive({ message: 'videoDurationSeconds phải lớn hơn 0' })
  videoDurationSeconds?: number;
}
