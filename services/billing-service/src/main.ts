import { initializeOpenTelemetry } from '@libs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import 'reflect-metadata';

type RawBodyFastifyRequest = FastifyRequest & {
  rawBody?: string;
};

function registerWebhookBodyParsers(app: NestFastifyApplication): void {
  const fastify = app.getHttpAdapter().getInstance();
  const parseRawBody = (
    req: FastifyRequest,
    body: string | Buffer,
    done: (error: Error | null, result?: unknown) => void,
  ) => {
    const rawBody = typeof body === 'string' ? body : body.toString('utf8');
    (req as RawBodyFastifyRequest).rawBody = rawBody;
    done(null, rawBody);
  };

  fastify.addContentTypeParser(
    ['application/x-www-form-urlencoded', 'application/octet-stream'],
    { parseAs: 'string' },
    parseRawBody,
  );
  fastify.addContentTypeParser(/^multipart\/form-data/i, { parseAs: 'string' }, parseRawBody);
  fastify.addContentTypeParser('*', { parseAs: 'string' }, parseRawBody);
}

async function bootstrap() {
  await initializeOpenTelemetry('billing-service');

  const { NestFactory } = await import('@nestjs/core');
  const { FastifyAdapter } = await import('@nestjs/platform-fastify');
  const { ValidationPipe, VersioningType } = await import('@nestjs/common');
  const { AppLogger, CorrelationIdInterceptor, GlobalExceptionFilter, OtelTracingInterceptor } =
    await import('@libs/common');
  const { AppModule } = await import('./app.module.js');

  const logger = new AppLogger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, trustProxy: true }),
    { bufferLogs: true, rawBody: true },
  );

  registerWebhookBodyParsers(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(new CorrelationIdInterceptor(), new OtelTracingInterceptor());
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (!allowedOrigins) {
    throw new Error('Need ALLOWED_ORIGINS config');
  }

  app.enableCors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  const portRaw = process.env.PORT;
  if (!portRaw) {
    throw new Error('Need PORT config');
  }

  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port)) {
    throw new Error('PORT must be a valid number');
  }

  app.enableShutdownHooks();

  const host = process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '::' : '127.0.0.1');
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await app.listen(port, host);
      logger.log(`Billing service running on port ${port}`, 'Bootstrap');
      return;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE' && attempt < maxRetries) {
        logger.warn(
          `Port ${port} in use, retrying in ${attempt * 500}ms... (${attempt}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, attempt * 500));
      } else {
        throw err;
      }
    }
  }
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
