import { IsNotEmpty, IsString } from 'class-validator';

export class ResourceIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
