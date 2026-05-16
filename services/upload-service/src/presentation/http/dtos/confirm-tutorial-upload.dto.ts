import { IsNotEmpty, IsString } from 'class-validator';

/** Data Transfer Object for confirming tutorial upload. */
export class ConfirmTutorialUploadDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsString()
  @IsNotEmpty()
  s3Key!: string;
}
