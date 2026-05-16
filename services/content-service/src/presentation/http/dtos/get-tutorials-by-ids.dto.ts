import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class GetTutorialsByIdsDto {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Handle both array form (?ids=id1&ids=id2) and comma-separated (?ids=id1,id2)
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').filter(Boolean);
    return [];
  })
  ids!: string[];
}
