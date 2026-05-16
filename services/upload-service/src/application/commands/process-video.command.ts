/** CQRS Command designed to enforce  process video. */
export class ProcessVideoCommand {
  constructor(
    public readonly fileId: string,
    public readonly s3Key: string,
    public readonly mimeType: string,
    public readonly uploadedBy: string,
  ) {}
}
