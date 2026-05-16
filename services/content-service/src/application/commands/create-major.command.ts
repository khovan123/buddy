import { CreateMajorDto } from '../../presentation/http/dtos/major.dto';

export class CreateMajorCommand {
  constructor(public readonly dto: CreateMajorDto) {}
}
