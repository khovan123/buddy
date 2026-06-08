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

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  majorId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(48)
  tag!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  authorName?: string;
}
