import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { ApiError } from "../http/api-response";

/** Bắt mọi exception → trả envelope ApiError chuẩn. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
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
        // KHÔNG trả exception.meta ra client — lộ tên cột/constraint DB (schema disclosure).
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

    const payload: ApiError = {
      success: false,
      error: {
        code,
        message: localizeErrorMessage(code, message, languageFromRequest(req)),
        details,
      },
    };
    res.status(status).json(payload);
  }
}

type Language = "vi" | "en";

function languageFromRequest(req: Request): Language {
  const raw = req.header("x-language") ?? req.header("accept-language") ?? "";
  return raw.toLowerCase().startsWith("en") ? "en" : "vi";
}

const EN_MESSAGES: Record<string, string> = {
  ALREADY_PAID: "The invoice has already been fully paid",
  ALREADY_REJECTED: "The request has already been rejected",
  BAD_AMOUNT: "Invalid amount",
  BAD_REQUEST: "Invalid request",
  BAD_STATUS: "Invalid status",
  BAD_TOTAL: "Discount exceeds the invoice total",
  CANCELED: "The invoice has been canceled",
  CONFLICT: "Conflict",
  DB_ERROR: "Database error",
  DOMAIN_TAKEN: "This domain is already in use",
  DUP_ALLERGY: "This allergy already exists",
  ERROR: "An error occurred",
  FEATURE_NOT_AVAILABLE: "This feature is not available on the current plan",
  FORBIDDEN: "You do not have permission to perform this action",
  INTERNAL_ERROR: "An unexpected error occurred",
  INVALID_CREDENTIALS: "Email/phone number or password is incorrect",
  INVALID_REFRESH: "Invalid refresh token",
  INVALID_SIGNATURE: "Invalid webhook signature",
  INVALID_TOKEN: "Invalid token",
  NO_ALLERGY: "Allergy declaration not found",
  NO_ANNOUNCEMENT: "Announcement not found",
  NO_ASSIGNMENT: "Assignment not found",
  NO_CLASSROOM: "Classroom not found",
  NO_DOMAIN: "Domain not found",
  NO_FILE: "File is required",
  NO_INVOICE: "Invoice not found",
  NO_LEAVE: "Leave request not found",
  NO_MEDIA: "Media file not found",
  NO_MEMBER: "Member not found",
  NO_MENU: "Menu not found",
  NO_STAFF: "Staff member not found",
  NO_STUDENT: "Student not found",
  NO_SUBSCRIPTION: "Subscription not found",
  NO_TENANT: "Tenant not found",
  NOT_FOUND: "Not found",
  NOTHING_DUE: "There is no remaining balance",
  QUOTA_EXCEEDED: "Plan quota exceeded",
  RATE_LIMITED: "Too many requests",
  SCHOOL_FORBIDDEN: "You do not have permission for this school",
  SLUG_UNAVAILABLE: "This slug is unavailable",
  SUBSCRIPTION_INACTIVE: "Subscription is inactive",
  SUBSCRIPTION_SUSPENDED: "Subscription is suspended",
  TAX_CODE_TAKEN: "This tax code has already been used to register another school",
  TENANT_MISMATCH: "This token does not match the current tenant",
  TENANT_REQUIRED:
    "Tenant context could not be resolved. Please sign in using the school's domain.",
  UNAUTHORIZED: "Unauthorized",
  UNIQUE_CONSTRAINT: "This data already exists",
  USER_INACTIVE: "The account is not available",
  VALIDATION_FAILED: "Invalid data",
};

function localizeErrorMessage(code: string, fallback: string, lang: Language): string {
  if (lang === "vi") return fallback;
  return EN_MESSAGES[code] ?? fallback;
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
