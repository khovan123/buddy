/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { FastifyReply, FastifyRequest } from 'fastify';
import { throwError } from 'rxjs';
import { getCorrelationId } from '../interceptors/correlation-id.interceptor';
import { AppLogger } from '../logger/app.logger';

/** Interface representing data constraints for  error response. */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  correlationId?: string;
  timestamp: string;
  path: string;
}

/** Represents the  global exception filter component. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  /**
   * Executes the catch operation.
   *
   * @param exception - The exception parameter
   * @param host - The host parameter
   */
  catch(exception: unknown, host: ArgumentsHost): void | any {
    const contextType = host.getType();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (contextType === 'rpc') {
      const message = this.extractMessage(exception);
      this.logger.error(
        `[RPC Exception] ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      // Return an RxJS Observable to properly pipe the error back without crashing the NestJS pipeline
      return throwError(() => new RpcException(message as string | object));
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (statusCode === 503) {
      this.logger.error(
        `[GlobalExceptionFilter] 503 Service Unavailable: ${JSON.stringify(
          exception instanceof HttpException ? exception.getResponse() : exception,
        )}`,
      );
    }

    const message = this.extractMessage(exception);

    const errorResponse: ErrorResponse = {
      statusCode,
      error: HttpStatus[statusCode] || 'INTERNAL_SERVER_ERROR',
      message,
      correlationId: getCorrelationId(),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `Unhandled exception: ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : undefined,
        { url: request.url, method: request.method },
      );
    } else {
      this.logger.warn(`HTTP ${statusCode}: ${JSON.stringify(message)}`, {
        url: request.url,
        method: request.method,
      });
    }

    response.status(statusCode).send(errorResponse);
  }

  /**
   * Executes the extract message operation.
   *
   * @param exception - The exception parameter
   * @returns Result of type string | string[]
   */
  private extractMessage(exception: unknown): string | string[] {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        return (response as any).message || exception.message;
      }
      return exception.message;
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Internal server error';
  }
}
