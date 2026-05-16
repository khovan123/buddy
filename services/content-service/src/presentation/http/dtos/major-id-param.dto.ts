import { IsNotEmpty, IsString } from 'class-validator';

export class MajorIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
