import { CareerStatus } from '../../domain/entities/career.entity';

export class UpdateCareerCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly status?: CareerStatus,
  ) {}
}
