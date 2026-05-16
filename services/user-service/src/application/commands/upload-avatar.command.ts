/** CQRS Command designed to enforce  upload avatar. */
export class UploadAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly avatarUrl: string,
  ) {}
}
