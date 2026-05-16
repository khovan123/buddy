import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { InteractionAction } from '@libs/contracts';
import type { InteractionContentType } from '@libs/contracts';

export class TrackInteractionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsEnum(['RESOURCE', 'TUTORIAL', 'RESOURCE_COLLECTION', 'TUTORIAL_COLLECTION'])
  itemType!: InteractionContentType;

  @IsEnum(InteractionAction)
  action!: InteractionAction;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  ratingValue?: number;

  @IsOptional()
  @IsString()
  commentId?: string;

  @IsOptional()
  @IsString()
  majorId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsNumber()
  semester?: number;
}
