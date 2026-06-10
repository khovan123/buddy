import { initializeOpenTelemetry } from '@libs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import 'reflect-metadata';

async function bootstrap() {
  await initializeOpenTelemetry('user-content-access-service');

  const { NestFactory } = await import('@nestjs/core');
  const { FastifyAdapter } = await import('@nestjs/platform-fastify');
  const { ValidationPipe, VersioningType } = await import('@nestjs/common');
  const { AppLogger, CorrelationIdInterceptor, GlobalExceptionFilter, OtelTracingInterceptor } =
    await import('@libs/common');
  const { AppModule } = await import('./app.module.js');

  const logger = new AppLogger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
      bodyLimit: 10 * 1024 * 1024,
    }),
    { bufferLogs: true },
  );

  app.useGlobalInterceptors(new CorrelationIdInterceptor(), new OtelTracingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (!allowedOrigins) {
    throw new Error('Need ALLOWED_ORIGINS config');
  }

  app.enableCors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const configuredHost =
        process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
      const host = configuredHost === '::' ? '0.0.0.0' : configuredHost;

      await app.listen(port, host);
      logger.log(`User content access service running on http://${host}:${port}`);
      return;
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;

      if (error.code === 'EADDRINUSE' && attempt < maxRetries) {
        logger.warn(
          `Port ${port} in use, retrying in ${attempt * 500}ms... (${attempt}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
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
