import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { GoogleAuth, IdTokenClient } from 'google-auth-library';

/**
 * Health indicator for Cloud Run services protected by IAM.
 */
@Injectable()
export class CloudRunHealthIndicator extends HealthIndicator {
  private readonly googleAuth = new GoogleAuth();
  private readonly idTokenClients = new Map<string, IdTokenClient>();

  async pingCheck(key: string, serviceUrl: string): Promise<HealthIndicatorResult> {
    try {
      const response = await fetch(serviceUrl, {
        method: 'GET',
        headers: await this.getCloudRunAuthHeader(serviceUrl),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status code ${response.status}`);
      }

      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        `${key} ping failed`,
        this.getStatus(key, false, { message: err instanceof Error ? err.message : String(err) }),
      );
    }
  }

  private async getCloudRunAuthHeader(serviceBaseUrl: string): Promise<Record<string, string>> {
    const audience = new URL(serviceBaseUrl).origin;

    let client = this.idTokenClients.get(audience);
    if (!client) {
      client = await this.googleAuth.getIdTokenClient(audience);
      this.idTokenClients.set(audience, client);
    }

    const headers = await client.getRequestHeaders();
    const authorization =
      headers.get('Authorization') ?? headers.get('authorization') ?? headers.get('AUTHORIZATION');

    if (!authorization) {
      return {};
    }

    return {
      'X-Serverless-Authorization': authorization,
    };
  }
}
