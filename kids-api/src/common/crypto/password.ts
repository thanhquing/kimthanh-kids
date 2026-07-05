import * as bcrypt from "bcrypt";

/**
 * Cost bcrypt lấy từ BCRYPT_COST (đọc lúc gọi để tôn trọng .env đã nạp; seed cũng dùng được).
 * Mặc định 12 (khuyến nghị OWASP). Clamp 10..15 để tránh cấu hình sai.
 */
function cost(): number {
  const n = Number(process.env.BCRYPT_COST ?? 12);
  if (!Number.isFinite(n)) return 12;
  return Math.min(15, Math.max(10, Math.trunc(n)));
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, cost());
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** true nếu hash đang dùng cost thấp hơn cấu hình hiện tại → nên rehash khi đăng nhập. */
export function needsRehash(hash: string): boolean {
  try {
    return bcrypt.getRounds(hash) < cost();
  } catch {
    return false;
  }
}
