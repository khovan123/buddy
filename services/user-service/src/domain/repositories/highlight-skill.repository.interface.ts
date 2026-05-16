import { PaginatedResult } from '@libs/contracts';

import { HighlightSkill, HighlightSkillStatus } from '../entities/highlight-skill.entity';

export interface HighlightSkillQueryItem {
  id: string;
  name: string;
  careerId: string;
  career?: { id: string; name: string };
  status: HighlightSkillStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/** Interface representing data constraints for  i highlight skill repository. */
export interface IHighlightSkillRepository {
  findAll(
    page: number,
    limit: number,
    careerId?: string,
  ): Promise<PaginatedResult<HighlightSkillQueryItem>>;
  findById(id: string): Promise<HighlightSkill | null>;
  findByCareerId(careerId: string): Promise<HighlightSkill[]>;
  create(data: { name: string; careerId: string }): Promise<HighlightSkill>;
  update(
    id: string,
    data: Partial<{ name: string; careerId: string; status: HighlightSkillStatus }>,
  ): Promise<HighlightSkill | null>;
  delete(id: string): Promise<void>;
}
