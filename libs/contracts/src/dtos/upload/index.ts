export interface PresignedUrlResult {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  s3Key: string;
  uploadUrl: string;
  estimatedTime: number;
}

export interface PresignedUrlRpcResponse {
  contentId: string;
  uploadUrl: PresignedUrlResult;
}

export interface PresignedUrlsRpcResponse {
  contentId: string;
  uploadUrls: PresignedUrlResult[];
}

export enum UploadType {
  RESOURCE = 'RESOURCE',
  TUTORIAL = 'TUTORIAL',
}

export enum ContentType {
  RESOURCE = 'RESOURCE',
  TUTORIAL = 'TUTORIAL',
}

export interface FileMetadata {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface GetPresignedUrlPayload {
  file: FileMetadata;
  uploadType: UploadType;
  uploadedBy: string;
  contentId: string;
  contentType: ContentType;
}

export interface GetPresignedUrlsPayload {
  files: FileMetadata[];
  uploadType: UploadType;
  uploadedBy: string;
  contentId: string;
  contentType: ContentType;
}
