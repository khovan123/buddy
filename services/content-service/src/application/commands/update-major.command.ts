import { UpdateMajorDto } from '../../presentation/http/dtos/major.dto';

export class UpdateMajorCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateMajorDto,
  ) {}
}
