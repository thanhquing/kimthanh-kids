import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { ApiError } from '@kimthanh/shared-types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.toErrorBody(exception, status);

    if (status >= 500) {
      this.logger.error(
        `[${request.method} ${request.url}] ${payload.error.code}: ${payload.error.message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method} ${request.url}] ${status} ${payload.error.code}`,
      );
    }

    response.status(status).json(payload);
  }

  private toErrorBody(exception: unknown, status: number): ApiError {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        return {
          success: false,
          error: {
            code: (r.code as string) ?? this.codeFromStatus(status),
            message: (r.message as string) ?? exception.message,
            messageKey: r.messageKey as string | undefined,
            details: r.details as Record<string, unknown> | undefined,
          },
        };
      }
      return {
        success: false,
        error: { code: this.codeFromStatus(status), message: exception.message },
      };
    }
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        messageKey: 'errors.internal',
      },
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_FAILED';
      default:
        return 'ERROR';
    }
  }
}
