import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetResourceByIdQuery } from '../get-resource-by-id.query';

/** CQRS Handler to retrieve a resource by its MongoDB ObjectId. */
@QueryHandler(GetResourceByIdQuery)
export class GetResourceByIdHandler implements IQueryHandler<GetResourceByIdQuery> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetResourceByIdQuery) {
    const item = await this.resourceRepository.findByIdWithDetails(query.id);
    if (!item) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }
}
