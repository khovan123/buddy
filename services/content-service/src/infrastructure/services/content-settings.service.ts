import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SystemSetting,
  SystemSettingDocument,
} from '../persistence/mongo/schemas/system-setting.schema';

const MODERATION_SETTING_KEY = 'content.moderation';

export interface ModerationSettings {
  enabled: boolean;
  source: 'runtime' | 'env';
  updatedAt: string | null;
  updatedBy: string | null;
}

@Injectable()
export class ContentSettingsService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(SystemSetting.name)
    private readonly settingsModel: Model<SystemSettingDocument>,
  ) {}

  async getModerationSettings(): Promise<ModerationSettings> {
    const setting = await this.settingsModel.findOne({ key: MODERATION_SETTING_KEY }).lean().exec();
    const enabled = this.resolveRuntimeEnabled(setting?.value);

    return {
      enabled: enabled ?? this.isEnvModerationEnabled(),
      source: enabled === null ? 'env' : 'runtime',
      updatedAt: this.toIsoString(setting?.updatedAt),
      updatedBy: setting?.updatedBy ?? null,
    };
  }

  async isModerationEnabled(): Promise<boolean> {
    return (await this.getModerationSettings()).enabled;
  }

  async updateModerationSettings(enabled: boolean, updatedBy: string): Promise<ModerationSettings> {
    await this.settingsModel
      .findOneAndUpdate(
        { key: MODERATION_SETTING_KEY },
        {
          $set: {
            key: MODERATION_SETTING_KEY,
            value: { enabled },
            updatedBy,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return this.getModerationSettings();
  }

  private resolveRuntimeEnabled(value: Record<string, unknown> | undefined): boolean | null {
    return typeof value?.enabled === 'boolean' ? value.enabled : null;
  }

  private isEnvModerationEnabled(): boolean {
    return this.config.get<string>('CONTENT_MODERATION_ENABLED', 'true') !== 'false';
  }

  private toIsoString(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString();
    return null;
  }
}
