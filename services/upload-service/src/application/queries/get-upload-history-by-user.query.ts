export class GetUploadHistoryByUserQuery {
  constructor(
    public readonly userId: string,
    public readonly contentType: string,
    public readonly limit?: number,
  ) {}
}
