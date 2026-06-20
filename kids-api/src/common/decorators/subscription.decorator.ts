import { SetMetadata } from "@nestjs/common";

export const ALLOW_INACTIVE_KEY = "allowInactiveSubscription";
/**
 * Cho phép route hoạt động kể cả khi subscription SUSPENDED/CANCELED/EXPIRED.
 * Dùng cho billing self-service (xem hóa đơn, thanh toán, gia hạn) & auth.
 */
export const AllowInactive = () => SetMetadata(ALLOW_INACTIVE_KEY, true);
