import { ProcessingStatus } from '../../domain/entities/file-metadata.entity';

/** Query to fetch paginated upload history for a user. */
export class GetUploadHistoryQuery {
  constructor(
    public readonly uploadedBy: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly status?: ProcessingStatus,
  ) {}
}
