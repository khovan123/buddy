import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as pino from 'pino';

function getRequiredEnv(name: 'LOG_LEVEL' | 'SERVICE_NAME' | 'NODE_ENV'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Need ${name} config`);
  }

  return value;
}

/** Interface representing data constraints for  log context. */
export interface LogContext {
  service?: string;
  correlationId?: string;
  userId?: string;
  traceId?: string;
  [key: string]: unknown;
}

/** Represents the  app logger component. */
@Injectable()
export class AppLogger implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor(private readonly context?: string) {
    const logLevel = getRequiredEnv('LOG_LEVEL');
    const serviceName = getRequiredEnv('SERVICE_NAME');
    const nodeEnv = getRequiredEnv('NODE_ENV');

    this.logger = pino.default({
      level: logLevel,
      transport:
        nodeEnv !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: false } }
          : undefined,
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: {
        service: serviceName,
        env: nodeEnv,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  /**
   * Executes the log operation.
   *
   * @param message - The message parameter
   * @param context - The context parameter
   */
  log(message: string, context?: string | LogContext): void {
    this.logger.info(this.buildMeta(context), message);
  }

  /**
   * Executes the error operation.
   *
   * @param message - The message parameter
   * @param trace - The trace parameter
   * @param context - The context parameter
   */
  error(message: string, trace?: string, context?: string | LogContext): void {
    this.logger.error({ ...this.buildMeta(context), stack: trace }, message);
  }

  /**
   * Executes the warn operation.
   *
   * @param message - The message parameter
   * @param context - The context parameter
   */
  warn(message: string, context?: string | LogContext): void {
    this.logger.warn(this.buildMeta(context), message);
  }

  /**
   * Executes the debug operation.
   *
   * @param message - The message parameter
   * @param context - The context parameter
   */
  debug(message: string, context?: string | LogContext): void {
    this.logger.debug(this.buildMeta(context), message);
  }

  /**
   * Executes the verbose operation.
   *
   * @param message - The message parameter
   * @param context - The context parameter
   */
  verbose(message: string, context?: string | LogContext): void {
    this.logger.trace(this.buildMeta(context), message);
  }

  /**
   * Executes the child operation.
   *
   * @param meta - The meta parameter
   * @returns Result of type AppLogger
   */
  child(meta: LogContext): AppLogger {
    const child = new AppLogger(this.context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (child as any).logger = this.logger.child(meta);
    return child;
  }

  /**
   * Executes the build meta operation.
   *
   * @param context - The context parameter
   * @returns Result of type Record<string, unknown>
   */
  private buildMeta(context?: string | LogContext): Record<string, unknown> {
    if (!context) return { context: this.context };
    if (typeof context === 'string') return { context };
    return context;
  }
}
