import { UploadType } from '@libs/contracts';

/**
 * GetUploadUrlQuery - CQRS Query để lấy presigned upload URL.
 * Hỗ trợ cả Resource và Tutorial uploads với tính toán ETA khác nhau.
 *
 * Params:
 * - fileName: Tên file gốc
 * - fileSizeBytes: Kích thước file (bytes)
 * - uploadType: 'resource' hoặc 'tutorial'
 * - videoDurationSeconds?: Độ dài video (chỉ dùng cho Tutorial)
 */
export class GetUploadUrlQuery {
  constructor(
    public readonly fileName: string,
    public readonly fileSizeBytes: number,
    public readonly mimeType: string,
    public readonly uploadType: UploadType,
    public readonly uploadedBy: string,
    public readonly contentId: string,
    public readonly contentType: string,
    public readonly keyPrefix?: string,
  ) {}
}
