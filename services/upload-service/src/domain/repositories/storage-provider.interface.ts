/** Interface representing data constraints for  presigned upload result. */
export interface PresignedUploadResult {
  fileKey: string;
  uploadUrl: string;
  bucket: string;
  mimeType: string;
}

/** Interface representing data constraints for  i storage provider. */
export interface IStorageProvider {
  generatePresignedUploadUrl(
    fileName: string,
    uploadType?: 'tutorial' | 'resource',
  ): Promise<PresignedUploadResult>;
}
