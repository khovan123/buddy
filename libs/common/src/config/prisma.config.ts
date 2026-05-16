import { defineConfig, env } from 'prisma/config';

function getRequiredEnv(name: 'PRISMA_SCHEMA' | 'PRISMA_MIGRATIONS_PATH'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Need ${name} config`);
  }

  return value;
}

export default defineConfig({
  schema: getRequiredEnv('PRISMA_SCHEMA'),
  migrations: {
    path: getRequiredEnv('PRISMA_MIGRATIONS_PATH'),
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
