import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MrrSnapshotService } from "./mrr-snapshot.service";

/**
 * Chốt MRR đầu mỗi tháng (00:05 ngày 1) cho tháng vừa kết thúc — số THỰC, bất biến.
 * Logic ở MrrSnapshotService để test gọi trực tiếp. Cron nằm trong tiến trình API (không daemon riêng);
 * khi chạy nhiều instance, upsert theo periodMonth là idempotent nên không tạo trùng.
 */
@Injectable()
export class MrrSnapshotCron {
  constructor(private readonly mrr: MrrSnapshotService) {}

  @Cron("5 0 1 * *")
  async monthly(): Promise<void> {
    await this.mrr.snapshotPreviousMonth();
  }
}
