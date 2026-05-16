import { IsNotEmpty, IsString } from 'class-validator';

export class CollectionSlugParamDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;
}
