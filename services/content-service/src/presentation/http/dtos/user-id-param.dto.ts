import { IsNotEmpty, IsString } from 'class-validator';

export class UserIdParamDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
