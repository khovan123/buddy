import { IsNotEmpty, IsString } from 'class-validator';

export class CollectionIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
