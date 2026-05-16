import { PaginatedResult } from '@libs/contracts';

import { Career, CareerStatus } from '../entities/career.entity';

export interface CareerQueryItem {
  id: string;
  name: string;
  description: string;
  status: CareerStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/** Interface representing data constraints for  i career repository. */
export interface ICareerRepository {
  findAll(page: number, limit: number, search?: string): Promise<PaginatedResult<CareerQueryItem>>;
  findById(id: string): Promise<Career | null>;
  create(data: { name: string; description: string }): Promise<Career>;
  update(
    id: string,
    data: Partial<{ name: string; description: string; status: CareerStatus }>,
  ): Promise<Career | null>;
  delete(id: string): Promise<void>;
}
