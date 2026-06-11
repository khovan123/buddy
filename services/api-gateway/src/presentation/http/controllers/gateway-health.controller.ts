import { Public } from '@libs/common';
import { CloudRunHealthIndicator } from '@libs/common/src/health/cloud-run-health.indicator';
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { ServiceRegistryService } from '../../../infrastructure/config/service-registry.service';

/** Controller handling incoming requests for GatewayHealth. */
@Controller({ path: 'health', version: '1' })
export class GatewayHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly cloudRun: CloudRunHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly registry: ServiceRegistryService,
  ) {}

  /**
   * Executes the check operation.
   *
   */
  @Get()
  @Public()
  @HealthCheck()
  async check() {
    const authUrl = `${this.registry.getUrl('auth')}/v1/health/liveness`;
    const userUrl = `${this.registry.getUrl('user')}/v1/health/liveness`;
    const notifyUrl = `${this.registry.getUrl('notification')}/v1/health/liveness`;
    const contentUrl = `${this.registry.getUrl('content')}/v1/health/liveness`;
    const uploadUrl = `${this.registry.getUrl('upload')}/v1/health/liveness`;
    const contentAccessUrl = `${this.registry.getUrl('content-access')}/v1/health/liveness`;
    const interactUrl = `${this.registry.getUrl('interaction')}/v1/health/liveness`;
    const recommendUrl = `${this.registry.getUrl('recommendation')}/v1/health/liveness`;
    const billingUrl = `${this.registry.getUrl('billing')}/v1/health/liveness`;

    console.log('[GatewayHealth] Pinging auth at:', authUrl);
    console.log('[GatewayHealth] Pinging user at:', userUrl);
    console.log('[GatewayHealth] Pinging notification at:', notifyUrl);
    console.log('[GatewayHealth] Pinging content at:', contentUrl);
    console.log('[GatewayHealth] Pinging content access at:', contentAccessUrl);
    console.log('[GatewayHealth] Pinging upload at:', uploadUrl);
    console.log('[GatewayHealth] Pinging billing at:', billingUrl);
    console.log('[GatewayHealth] Pinging interaction at:', interactUrl);
    console.log('[GatewayHealth] Pinging recommendation at:', recommendUrl);

    try {
      const result = await this.health.check([
        () => this.cloudRun.pingCheck('auth-service', authUrl),
        () => this.cloudRun.pingCheck('user-service', userUrl),
        () => this.cloudRun.pingCheck('notification-service', notifyUrl),
        () => this.cloudRun.pingCheck('content-service', contentUrl),
        () => this.cloudRun.pingCheck('content-access-service', contentAccessUrl),
        () => this.cloudRun.pingCheck('upload-service', uploadUrl),
        () => this.cloudRun.pingCheck('billing-service', billingUrl),
        () => this.cloudRun.pingCheck('interaction-service', interactUrl),
        () => this.cloudRun.pingCheck('recommendation-service', recommendUrl),
        () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      ]);
      return result;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('[GatewayHealth] Health check failed:', err.message);
      if (err.response) {
        console.error('[GatewayHealth] Error details:', JSON.stringify(err.response, null, 2));
      }
      throw err;
    }
  }

  /**
   * Executes the liveness operation.
   *
   */
  @Get('liveness')
  @Public()
  liveness() {
    return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() };
  }
}
