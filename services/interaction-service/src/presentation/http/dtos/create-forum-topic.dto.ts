import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateForumTopicDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  excerpt!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  authorName?: string;
}
