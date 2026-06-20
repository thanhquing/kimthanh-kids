import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import { ApiError } from "../http/api-response";

/** Bắt mọi exception → trả envelope ApiError chuẩn. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "Đã có lỗi xảy ra";
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        message = (b.message as string) ?? message;
        code = (b.code as string) ?? httpStatusToCode(status);
        details = b.details;
      }
      if (code === "INTERNAL_ERROR") code = httpStatusToCode(status);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;
        code = "UNIQUE_CONSTRAINT";
        message = "Dữ liệu đã tồn tại";
        details = exception.meta;
      } else if (exception.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        code = "NOT_FOUND";
        message = "Không tìm thấy bản ghi";
      } else {
        status = HttpStatus.BAD_REQUEST;
        code = "DB_ERROR";
        message = "Lỗi cơ sở dữ liệu";
      }
    }

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`${code}: ${message}`);
    }

    const payload: ApiError = { success: false, error: { code, message, details } };
    res.status(status).json(payload);
  }
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION_FAILED";
    case 429:
      return "RATE_LIMITED";
    default:
      return "ERROR";
  }
}
