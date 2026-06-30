import { IsBoolean } from 'class-validator';

export class UpdateModerationSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}
