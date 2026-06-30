import { AmqpConnection, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { EXCHANGES } from '../config/rabbitmq.config';

export const RABBITMQ_CONNECTION = Symbol('RABBITMQ_CONNECTION');
export const RABBITMQ_DEFAULT_TIMEOUT_MS = 180_000;

function getRequiredRabbitMqUrl(): URL {
  const rawUrl = process.env.RABBITMQ_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (!rawUrl) {
    throw new Error('Need RABBITMQ_URL config for MessagingModule');
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid RABBITMQ_URL config for MessagingModule');
  }

  if (url.protocol !== 'amqp:' && url.protocol !== 'amqps:') {
    throw new Error('RABBITMQ_URL must use amqp:// or amqps://');
  }

  if (url.protocol === 'amqps:' && url.port === '5672') {
    throw new Error(
      'RABBITMQ_URL uses amqps:// with non-TLS port 5672; use port 5671 or omit port',
    );
  }

  return url;
}

function getPositiveIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      useFactory: () => {
        const url = getRequiredRabbitMqUrl();
        const heartbeatIntervalInSeconds = getPositiveIntEnv('RABBITMQ_HEARTBEAT_SECONDS', 30);
        const reconnectTimeInSeconds = getPositiveIntEnv('RABBITMQ_RECONNECT_SECONDS', 5);
        const defaultRpcTimeout = getPositiveIntEnv(
          'RABBITMQ_RPC_TIMEOUT_MS',
          RABBITMQ_DEFAULT_TIMEOUT_MS,
        );

        return {
          exchanges: [
            { name: EXCHANGES.AUTH, type: 'topic' },
            { name: EXCHANGES.USER, type: 'topic' },
            { name: EXCHANGES.BILLING, type: 'topic' },
            { name: EXCHANGES.ACCESS, type: 'topic' },
            { name: EXCHANGES.NOTIFICATION, type: 'topic' },
            { name: EXCHANGES.UPLOAD, type: 'topic' },
            { name: EXCHANGES.INTERACTION, type: 'topic' },
            { name: EXCHANGES.CONTENT, type: 'topic' },
            {
              name: EXCHANGES.CONTENT_SYNC,
              type: 'fanout',
              options: { arguments: { 'alternate-exchange': EXCHANGES.DEAD_LETTER } },
            },
            { name: EXCHANGES.DEAD_LETTER, type: 'direct' },
          ],
          uri: url.toString(),
          defaultRpcTimeout,
          connectionManagerOptions: {
            heartbeatIntervalInSeconds,
            reconnectTimeInSeconds,
            connectionOptions:
              url.protocol === 'amqps:'
                ? {
                    servername: url.hostname,
                    clientProperties: {
                      connection_name: `${process.env.SERVICE_NAME ?? 'service'}:${
                        process.env.K_REVISION ?? process.env.NODE_ENV ?? 'local'
                      }`,
                    },
                  }
                : {
                    clientProperties: {
                      connection_name: `${process.env.SERVICE_NAME ?? 'service'}:${
                        process.env.K_REVISION ?? process.env.NODE_ENV ?? 'local'
                      }`,
                    },
                  },
          },
          connectionInitOptions: { wait: false, timeout: RABBITMQ_DEFAULT_TIMEOUT_MS },
          enableControllerDiscovery: true,
        };
      },
    }),
  ],
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useExisting: AmqpConnection,
    },
  ],
  exports: [RabbitMQModule, RABBITMQ_CONNECTION],
})
export class MessagingModule {}
