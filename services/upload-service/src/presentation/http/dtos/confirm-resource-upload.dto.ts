import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

/** Data Transfer Object for  confirm resource upload. */
export class ConfirmResourceUploadDto {
  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  fileIds!: string[];
}
