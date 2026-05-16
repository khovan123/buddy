import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ServiceName =
  | 'auth'
  | 'user'
  | 'notification'
  | 'content'
  | 'upload'
  | 'content-access'
  | 'billing'
  | 'interaction'
  | 'recommendation';

/** Service handling business logic for  registry service. */
@Injectable()
export class ServiceRegistryService {
  private readonly registry: Record<ServiceName, string>;

  constructor(private readonly config: ConfigService) {
    this.registry = {
      auth: config.get<string>('AUTH_SERVICE_URL', 'http://0.0.0.0:3001'),
      user: config.get<string>('USER_SERVICE_URL', 'http://0.0.0.0:3002'),
      notification: config.get<string>('NOTIFICATION_SERVICE_URL', 'http://0.0.0.0:3003'),
      content: config.get<string>('CONTENT_SERVICE_URL', 'http://0.0.0.0:3004'),
      upload: config.get<string>('UPLOAD_SERVICE_URL', 'http://0.0.0.0:3005'),
      billing: config.get<string>('BILLING_SERVICE_URL', 'http://0.0.0.0:3006'),
      'content-access': config.get<string>('CONTENT_ACCESS_SERVICE_URL', 'http://0.0.0.0:3007'),
      interaction: config.get<string>('INTERACTION_SERVICE_URL', 'http://0.0.0.0:3008'),
      recommendation: config.get<string>('RECOMMENDATION_SERVICE_URL', 'http://0.0.0.0:3009'),
    };
    console.log('[ServiceRegistry] Initialized with:', this.registry);
    console.log('[ServiceRegistry] NODE_ENV:', process.env.NODE_ENV);
  }

  /**
   * Executes the get url operation.
   *
   * @param service - The service parameter
   * @returns Result of type string
   */
  getUrl(service: ServiceName): string {
    return this.registry[service];
  }

  /**
   * Executes the get service url operation.
   *
   * @param service - The service parameter
   * @param path - The path parameter
   * @returns Result of type string
   */
  getServiceUrl(service: ServiceName, path: string): string {
    return `${this.registry[service]}${path}`;
  }
}
