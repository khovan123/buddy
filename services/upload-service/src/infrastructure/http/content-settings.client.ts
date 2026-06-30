import { AppLogger } from '@libs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RuntimeModerationSettingsResponse = {
  data?: {
    enabled?: boolean;
  };
};

@Injectable()
export class ContentSettingsClient {
  private readonly logger = new AppLogger(ContentSettingsClient.name);

  constructor(private readonly config: ConfigService) {}

  async isModerationEnabled(): Promise<boolean> {
    const remoteEnabled = await this.fetchRuntimeModerationEnabled();
    if (remoteEnabled !== null) {
      return remoteEnabled;
    }

    return this.config.get<string>('CONTENT_MODERATION_ENABLED', 'true') !== 'false';
  }

  private async fetchRuntimeModerationEnabled(): Promise<boolean | null> {
    const baseUrl =
      this.config.get<string>('API_GATEWAY_URL') ?? this.config.get<string>('CONTENT_SERVICE_URL');
    if (!baseUrl) {
      return null;
    }

    try {
      const response = await fetch(this.buildRuntimeSettingsUrl(baseUrl), {
        method: 'GET',
        signal: AbortSignal.timeout(2_000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Could not fetch content moderation runtime setting: HTTP ${response.status}`,
        );
        return null;
      }

      const body = (await response.json()) as RuntimeModerationSettingsResponse;
      return typeof body.data?.enabled === 'boolean' ? body.data.enabled : null;
    } catch (error) {
      this.logger.warn(
        `Could not fetch content moderation runtime setting: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private buildRuntimeSettingsUrl(baseUrl: string): string {
    const normalizedBase = baseUrl.endsWith('/v1') ? baseUrl.slice(0, -3) : baseUrl;
    return `${normalizedBase.replace(/\/$/, '')}/v1/content-settings/moderation/runtime`;
  }
}
