import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CheckAccessQuery } from '../check-access.query';

@QueryHandler(CheckAccessQuery)
export class CheckAccessHandler implements IQueryHandler<CheckAccessQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: CheckAccessQuery): Promise<boolean> {
    const access = await this.prisma.client.userResourceAccess.findFirst({
      where: {
        userId: query.userId,
        resourceId: query.resourceId,
        deletedAt: null,
      },
    });

    return !!access;
  }
}
