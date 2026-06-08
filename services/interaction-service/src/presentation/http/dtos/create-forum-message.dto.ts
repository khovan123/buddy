import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateForumMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  authorName?: string;
}
