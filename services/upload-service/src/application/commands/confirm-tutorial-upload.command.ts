export class ConfirmTutorialUploadCommand {
  constructor(
    public readonly fileId: string,
    public readonly s3Key: string,
    public readonly uploadedBy: string,
  ) {}
}
