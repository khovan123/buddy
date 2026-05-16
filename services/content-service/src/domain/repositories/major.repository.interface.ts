import { MajorEntity, MajorStatus } from '../entities/major.entity';

export interface MajorQueryItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: MajorStatus;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

/** Interface representing data constraints for  i major repository. */
export interface IMajorRepository {
  findAll(): Promise<MajorQueryItem[]>;
  findById(id: string): Promise<MajorEntity | null>;
  findByIds(ids: string[]): Promise<MajorEntity[]>;
  create(data: Partial<MajorEntity>): Promise<MajorEntity>;
  update(id: string, data: Partial<MajorEntity>): Promise<MajorEntity | null>;
  delete(id: string): Promise<boolean>;
}
