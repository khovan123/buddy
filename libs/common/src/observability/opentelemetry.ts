import { metrics } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import * as dotenv from 'dotenv';

let sdk: NodeSDK | null = null;
let startPromise: Promise<void> | null = null;
let shutdownHookRegistered = false;

function isDisabled(): boolean {
  const disabled = process.env.OTEL_SDK_DISABLED?.toLowerCase();
  return disabled === 'true' || disabled === '1' || disabled === 'yes';
}

function getServiceVersion(): string {
  const npmPackageVersion = process.env.npm_package_version;
  if (npmPackageVersion) {
    return npmPackageVersion;
  }

  const serviceVersion = process.env.SERVICE_VERSION;
  if (!serviceVersion) {
    throw new Error('Need SERVICE_VERSION config');
  }

  return serviceVersion;
}

function registerShutdownHooks(): void {
  if (shutdownHookRegistered) {
    return;
  }

  shutdownHookRegistered = true;

  const shutdown = async (): Promise<void> => {
    if (!sdk) {
      return;
    }

    try {
      await sdk.shutdown();
    } catch {
      // Ignore shutdown errors during process teardown.
    }
  };

  process.once('SIGTERM', () => {
    void shutdown();
  });

  process.once('SIGINT', () => {
    void shutdown();
  });
}

export async function initializeOpenTelemetry(serviceName: string): Promise<void> {
  dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env' });

  if (process.env.NODE_ENV === 'test' || isDisabled()) {
    return;
  }

  const GRAFANA_URL = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const GRAFANA_AUTH = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  const GRAFANA_SERVICE_NAME = process.env.OTEL_RESOURCE_ATTRIBUTES;
  const nodeEnv = process.env.NODE_ENV;

  if (!GRAFANA_AUTH || !GRAFANA_URL) {
    throw new Error('Need Grafana config');
  }

  if (!GRAFANA_SERVICE_NAME) {
    throw new Error('Need OTEL_RESOURCE_ATTRIBUTES config');
  }

  if (!nodeEnv) {
    throw new Error('Need NODE_ENV config');
  }

  if (!startPromise) {
    const otelServiceName = process.env.OTEL_SERVICE_NAME;
    const resolvedServiceName = otelServiceName ?? serviceName;
    if (!resolvedServiceName) {
      throw new Error('Need SERVICE_NAME config');
    }

    // diag.setLogger(
    //   new DiagConsoleLogger(),
    //   nodeEnv === 'development' ? DiagLogLevel.NONE : DiagLogLevel.ERROR,
    // );
    sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: resolvedServiceName,
        [ATTR_SERVICE_VERSION]: getServiceVersion(),
        'deployment.environment': nodeEnv,
        'service.namespace': GRAFANA_SERVICE_NAME,
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${GRAFANA_URL}/v1/traces`, // Phải có /v1/traces
        headers: { Authorization: GRAFANA_AUTH },
      }),
      metricReader:
        nodeEnv === 'development'
          ? undefined
          : new PeriodicExportingMetricReader({
              exporter: new OTLPMetricExporter({
                url: `${GRAFANA_URL}/v1/metrics`, // Phải có /v1/metrics
                headers: { Authorization: GRAFANA_AUTH },
              }),
            }),
      // spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-net': { enabled: false },
        }),
        new PrismaInstrumentation(),
      ],
    });

    registerShutdownHooks();
    startPromise = (async () => {
      sdk.start();

      const meterProvider = metrics.getMeterProvider();

      const hostMetrics = new HostMetrics({
        meterProvider: meterProvider,
        name: `${resolvedServiceName}-host-metrics`,
      });
      hostMetrics.start();
    })();
  }

  await startPromise;
}
