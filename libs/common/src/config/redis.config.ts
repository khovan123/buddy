import { redisStore } from 'cache-manager-ioredis-yet';
import type { Cluster, Redis, RedisOptions } from 'ioredis';

const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;
const redisErrorLogTimes = new Map<string, number>();

const getServiceName = () =>
  process.env.SERVICE_NAME || process.env.npm_package_name || 'unknown-service';

const shouldLogRedisError = (key: string): boolean => {
  const now = Date.now();
  const previous = redisErrorLogTimes.get(key) ?? 0;
  if (now - previous < REDIS_ERROR_LOG_INTERVAL_MS) {
    return false;
  }

  redisErrorLogTimes.set(key, now);
  return true;
};

const parseRedisPort = (): number => {
  const portRaw = process.env.REDIS_PORT;
  if (!portRaw) {
    throw new Error('Need Redis port config');
  }

  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port)) {
    throw new Error('REDIS_PORT must be a valid number');
  }

  return port;
};

export function getRedisConnectionOptions(
  role: string,
  overrides: RedisOptions = {},
): RedisOptions {
  const host = process.env.REDIS_HOST;
  if (!host) {
    throw new Error('Need Redis host config');
  }

  const port = parseRedisPort();
  const password = process.env.REDIS_PASSWORD;
  const serviceName = getServiceName();

  return {
    host,
    port,
    password,
    connectionName: `${serviceName}:${role}`,
    connectTimeout: Number.parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS ?? '5000', 10),
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => {
      const maxAttempts = Number.parseInt(process.env.REDIS_RETRY_ATTEMPTS ?? '10', 10);
      if (attempt > maxAttempts) {
        return null;
      }

      return Math.min(attempt * 250, 5_000);
    },
    reconnectOnError: (error) => {
      if (error.message.includes('max number of clients reached')) {
        return false;
      }

      return false;
    },
    ...overrides,
  };
}

export function registerRedisErrorLogger(client: Redis | Cluster, role: string): void {
  const serviceName = getServiceName();

  client.on('error', (error: Error) => {
    const logKey = `${serviceName}:${role}:${error.message}`;
    if (!shouldLogRedisError(logKey)) {
      return;
    }

    if (error.message.includes('max number of clients reached')) {
      console.warn(
        `[Redis:${role}] Redis refused ${serviceName} because max clients was reached. ` +
          'Cache/queue features may be degraded until capacity is available.',
      );
      return;
    }

    console.warn(`[Redis:${role}] ${error.message}`);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRedisConfig(): Promise<any> {
  const store = await redisStore({
    ...getRedisConnectionOptions('cache'),
    ttl: 300 * 1000,
  });
  registerRedisErrorLogger(store.client, 'cache');

  return store;
}

export const REDIS_KEYS = {
  userSession: (userId: string) => `session:${userId}`,
  refreshToken: (userId: string) => `refresh:${userId}`,
  rateLimitLogin: (ip: string) => `rate:login:${ip}`,
  userProfile: (userId: string) => `profile:${userId}`,
  contentUserProfile: (userId: string) => `content:profile:${userId}`,
} as const;
