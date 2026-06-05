export class UpdateResourceCommand {
  constructor(
    public readonly resourceId: string,
    public readonly requesterId: string,
    public readonly title: string,
    public readonly summary: string,
    public readonly hightlights: string[],
    public readonly majorId: string,
    public readonly courseId: string,
    public readonly price: number,
    public readonly collectionId?: string,
    public readonly thumbnailBase64?: string,
    public readonly correlationId?: string,
  ) {}
}
