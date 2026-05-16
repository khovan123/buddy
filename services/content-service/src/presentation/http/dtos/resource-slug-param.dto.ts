import { IsNotEmpty, IsString } from 'class-validator';

export class ResourceSlugParamDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;
}
