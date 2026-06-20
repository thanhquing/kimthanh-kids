import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { tenantExtension } from "./prisma-tenant.extension";

function buildExtended(base: PrismaClient) {
  return base.$extends(tenantExtension());
}
export type ExtendedPrismaClient = ReturnType<typeof buildExtended>;

/**
 * Quản lý kết nối Prisma + áp tenant-isolation extension.
 * Dùng `prisma.db` (đã extend, auto-filter theo tenant) cho mọi truy vấn nghiệp vụ.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly base: PrismaClient;
  /** Client đã áp tenant-isolation. Dùng cho self-service tenant & domain (Phase 1). */
  public readonly db: ExtendedPrismaClient;

  constructor() {
    this.base = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    this.db = buildExtended(this.base);
  }

  /**
   * Client THÔ (không filter theo tenant). CHỈ dùng cho tác vụ hệ thống xuyên tenant:
   * tenant resolution, provisioning, auth (tra user), cron/billing, platform-admin.
   * KHÔNG dùng trong code phục vụ 1 tenant — sẽ rò rỉ dữ liệu.
   */
  get system(): PrismaClient {
    return this.base;
  }

  async onModuleInit(): Promise<void> {
    await this.base.$connect();
    this.logger.log("Prisma connected");
  }

  async onModuleDestroy(): Promise<void> {
    await this.base.$disconnect();
  }
}
