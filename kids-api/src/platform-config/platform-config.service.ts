import { Injectable } from "@nestjs/common";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

const SINGLETON_ID = "singleton";

export interface UpdatePlatformConfigInput {
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  pastDueGraceDays?: number;
  suspendedGraceDays?: number;
}

/**
 * Cấu hình NỀN TẢNG (1 hàng, id="singleton") — tách module riêng để cả platform (đọc/sửa)
 * lẫn billing-jobs (đọc grace dunning) dùng chung mà KHÔNG tạo phụ thuộc vòng giữa 2 module.
 */
@Injectable()
export class PlatformConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  /** Lấy config; tạo mặc định (grace lấy từ ENV) nếu chưa có. */
  async get() {
    const existing = await this.prisma.system.platformConfig.findFirst();
    if (existing) return existing;
    return this.prisma.system.platformConfig.create({
      data: {
        id: SINGLETON_ID,
        pastDueGraceDays: this.env.get("PAST_DUE_GRACE_DAYS"),
        suspendedGraceDays: this.env.get("SUSPENDED_GRACE_DAYS"),
      },
    });
  }

  async update(input: UpdatePlatformConfigInput) {
    await this.get(); // đảm bảo hàng tồn tại
    return this.prisma.system.platformConfig.update({
      where: { id: SINGLETON_ID },
      data: {
        bankBin: input.bankBin ?? undefined,
        bankAccountNumber: input.bankAccountNumber ?? undefined,
        bankAccountName: input.bankAccountName ?? undefined,
        pastDueGraceDays: input.pastDueGraceDays ?? undefined,
        suspendedGraceDays: input.suspendedGraceDays ?? undefined,
      },
    });
  }

  /** Grace dunning (ngày) — nguồn sự thật cho billing-jobs. ENV chỉ là giá trị khởi tạo. */
  async graceDays(): Promise<{ pastDue: number; suspended: number }> {
    const c = await this.get();
    return { pastDue: c.pastDueGraceDays, suspended: c.suspendedGraceDays };
  }
}
