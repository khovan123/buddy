import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IContentAccessRepository } from '../../../domain/repositories/content-access.repository.interfaces';
import { CONTENT_ACCESS_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListUserAccessQuery } from '../list-user-access.query';

export type UserAccessItem = {
  resourceId: string;
  resourceType: 'RESOURCE' | 'COLLECTION' | 'TUTORIAL';
  purchaseId: string | null;
  grantedAt: Date;
};

@QueryHandler(ListUserAccessQuery)
export class ListUserAccessHandler implements IQueryHandler<ListUserAccessQuery> {
  constructor(
    @Inject(CONTENT_ACCESS_REPOSITORY)
    private readonly contentAccessRepository: IContentAccessRepository,
  ) {}

  async execute(query: ListUserAccessQuery): Promise<UserAccessItem[]> {
    const rows = await this.contentAccessRepository.listByUserId(query.userId);

    return rows.map((row) => ({
      resourceId: row.resourceId,
      resourceType: row.resourceType,
      purchaseId: row.purchaseId,
      grantedAt: row.grantedAt,
    }));
  }
}
