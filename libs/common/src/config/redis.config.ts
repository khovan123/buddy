import { redisStore } from 'cache-manager-ioredis-yet';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRedisConfig(): Promise<any> {
  const host = process.env.REDIS_HOST;
  if (!host) {
    throw new Error('Need Redis host config');
  }

  const portRaw = process.env.REDIS_PORT;
  if (!portRaw) {
    throw new Error('Need Redis port config');
  }

  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port)) {
    throw new Error('REDIS_PORT must be a valid number');
  }

  const password = process.env.REDIS_PASSWORD;
  if (!portRaw) {
    throw new Error('Need Redis password config');
  }

  const store = await redisStore({
    host,
    port,
    password,
    ttl: 300 * 1000,
  });

  return store;
}

export const REDIS_KEYS = {
  userSession: (userId: string) => `session:${userId}`,
  refreshToken: (userId: string) => `refresh:${userId}`,
  rateLimitLogin: (ip: string) => `rate:login:${ip}`,
  userProfile: (userId: string) => `profile:${userId}`,
  contentUserProfile: (userId: string) => `content:profile:${userId}`,
} as const;
