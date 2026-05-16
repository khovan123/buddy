import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Data Transfer Object for  process video. */
export class ProcessVideoDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsString()
  @IsNotEmpty()
  s3Key!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsOptional()
  @IsString()
  uploadedBy?: string;
}
