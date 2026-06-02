import { initializeOpenTelemetry } from '@libs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import 'reflect-metadata';
// import { AppModule } from './app.module';

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

  const addRawParser = (contentType: string | RegExp) => {
    if (!fastify.hasContentTypeParser(contentType)) {
      fastify.addContentTypeParser(contentType, { parseAs: 'string' }, parseRawBody);
    }
  };

  addRawParser('application/x-www-form-urlencoded');
  addRawParser('application/octet-stream');
}

async function bootstrap() {
  await initializeOpenTelemetry('api-gateway');

  const { NestFactory } = await import('@nestjs/core');
  const { FastifyAdapter } = await import('@nestjs/platform-fastify');
  const { ValidationPipe, VersioningType } = await import('@nestjs/common');
  const helmet = (await import('@fastify/helmet')).default;
  const contentParser = (await import('@fastify/multipart')).default;
  const { AppLogger, CorrelationIdInterceptor, GlobalExceptionFilter } =
    await import('@libs/common');
  const { AppModule } = await import('./app.module.js');

  const logger = new AppLogger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
      bodyLimit: 10 * 1024 * 1024, // 10MB
    }),
    { bufferLogs: true, rawBody: true },
  );

  // ── Security ──────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  // ── CORS ──────────────────────────────────────────────────────────
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (!allowedOrigins) {
    throw new Error('Need ALLOWED_ORIGINS config');
  }

  app.enableCors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'x-idempotency-key',
      'x-secret-key',
      'x-sepay-signature',
      'x-sepay-timestamp',
    ],
    exposedHeaders: ['x-correlation-id'],
  });

  // ── Global interceptors ───────────────────────────────────────────
  app.useGlobalInterceptors(new CorrelationIdInterceptor());

  await app.register(contentParser, {
    limits: {
      fileSize: 50 * 1024 * 1024, //50MB
    },
  });

  // ── Global pipes ──────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters ────────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // ── Versioning ────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Swagger & Scalar API Docs ─────────────────────────────────────
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const { apiReference } = await import('@scalar/nestjs-api-reference');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Unibuddy API Gateway')
    .setDescription('API documentation for Unibuddy Microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Standard Swagger UI at /api-docs-swagger (optional, good as a fallback)
  SwaggerModule.setup('api-docs-swagger', app, document);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.getHttpAdapter().get('/api-docs', (req: any, res: any) => {
    const handler = apiReference({
      spec: { content: document },
      theme: 'purple',
      withFastify: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Fastify with withFastify: true expects the raw ServerResponse
    handler(req, res.raw);
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
  await app.init();
  registerWebhookBodyParsers(app);

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const configuredHost =
        process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
      const host = configuredHost === '::' ? '0.0.0.0' : configuredHost;
      await app.listen(port, host);
      logger.log(`API Gateway running on http://${host}:${port}`);
      return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
