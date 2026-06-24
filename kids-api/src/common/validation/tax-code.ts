/**
 * Mã số thuế Việt Nam (MST).
 * - 10 số: pháp nhân/tổ chức/hộ kinh doanh.
 * - 13 số (10 + 3): đơn vị trực thuộc/địa điểm (chi nhánh) — `xxxxxxxxxx-001`.
 * Số thứ 10 là checksum của 9 số đầu (thuật toán Tổng cục Thuế): check = 10 − (Σ dᵢ·wᵢ mod 11).
 */
const WEIGHTS = [31, 29, 23, 19, 17, 13, 7, 5, 3];

/** Bỏ khoảng trắng và dấu gạch nối. */
export function normalizeTaxCode(raw: string): string {
  return (raw ?? "").replace(/[\s-]/g, "");
}

function validChecksum(core10: string): boolean {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(core10[i]) * WEIGHTS[i];
  const check = (10 - (sum % 11)) % 10; // map trường hợp 10 → 0
  return check === Number(core10[9]);
}

/** True nếu MST hợp lệ: đúng 10 hoặc 13 chữ số và 10 số đầu khớp checksum. */
export function isValidTaxCode(raw: string): boolean {
  const s = normalizeTaxCode(raw);
  if (!/^\d{10}(\d{3})?$/.test(s)) return false;
  return validChecksum(s.slice(0, 10));
}
