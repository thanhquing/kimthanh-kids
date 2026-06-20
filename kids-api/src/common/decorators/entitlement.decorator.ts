import { SetMetadata } from "@nestjs/common";
import { LimitMetric } from "@prisma/client";

export const REQUIRE_FEATURE_KEY = "requireFeature";
export const CHECK_QUOTA_KEY = "checkQuota";

/** Chặn route nếu gói của tenant KHÔNG bật featureKey (feature-gating). */
export const RequireFeature = (featureKey: string) => SetMetadata(REQUIRE_FEATURE_KEY, featureKey);

/** Đánh dấu route tiêu thụ quota của metric (Phase 1 dùng để +1 sau khi tạo). */
export const CheckQuota = (metric: LimitMetric) => SetMetadata(CHECK_QUOTA_KEY, metric);
