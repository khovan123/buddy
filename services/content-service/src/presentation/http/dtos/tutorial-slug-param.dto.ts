import { IsNotEmpty, IsString } from 'class-validator';

export class TutorialSlugParamDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;
}
