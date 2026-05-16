import { IsNotEmpty, IsString } from 'class-validator';

export class TutorialIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
