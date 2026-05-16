/** CQRS Command designed to enforce confirm resource upload. */
export class ConfirmResourceUploadCommand {
  constructor(
    public readonly resourceId: string,
    public readonly fileIds: string[],
    public readonly userId: string,
  ) {}
}
