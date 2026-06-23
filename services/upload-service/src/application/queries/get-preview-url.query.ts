/**
 * CQRS Query to request a document preview URL.
 *
 * Accepts the S3 key of the original file.
 * The handler looks up the MediaFile by s3Key to resolve
 * preview status and previewS3Key.
 */
export class GetPreviewUrlQuery {
  constructor(
    public readonly s3Key: string,
    public readonly fullAccess = false,
  ) {}
}
