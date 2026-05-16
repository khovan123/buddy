import { ResourceStatus } from '../../infrastructure/persistence/mongo/schemas/resource.schema';
import type { ResourceMeta } from '../entities/resource.entity';

/** Represents the  resource created domain event component. */
export class ResourceCreatedDomainEvent {
  constructor(
    public readonly payload: {
      userId: string;
      price: number;
      title: string;
      summary: string;
      status: ResourceStatus;
      resourceMeta: ResourceMeta[];
      collectionId?: string;
    },
  ) {}
}
