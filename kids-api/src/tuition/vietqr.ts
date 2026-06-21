/**
 * Sinh chuỗi VietQR (napas247, chuẩn EMVCo) — MIỄN PHÍ, không phụ thuộc bên thứ ba.
 * Phụ huynh quét bằng app ngân hàng → chuyển khoản đúng số tiền + nội dung (số hóa đơn).
 * Tham chiếu: EMVCo Merchant-Presented QR + đặc tả VietQR (GUID A000000727).
 */

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — 4 hex hoa. */
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Chuẩn hóa nội dung CK: bỏ dấu, chỉ giữ [A-Z0-9 ], tối đa 25 ký tự (an toàn mọi bank). */
export function sanitizeAddInfo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25);
}

export interface VietQrInput {
  bankBin: string; // mã ngân hàng napas (6 số)
  accountNumber: string;
  amount: number; // VND nguyên
  addInfo?: string; // nội dung CK (vd số hóa đơn)
}

/** Trả về chuỗi QR (dynamic, có số tiền) — UI render thành mã QR. */
export function buildVietQrPayload(p: VietQrInput): string {
  const beneficiary = tlv("00", p.bankBin) + tlv("01", p.accountNumber);
  const merchant = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA");
  let s =
    tlv("00", "01") + // format indicator
    tlv("01", "12") + // dynamic (có số tiền)
    tlv("38", merchant) +
    tlv("53", "704") + // VND
    tlv("54", String(Math.round(p.amount))) +
    tlv("58", "VN");
  if (p.addInfo) {
    const info = sanitizeAddInfo(p.addInfo);
    if (info) s += tlv("62", tlv("08", info));
  }
  s += "6304"; // CRC tag + length, CRC tính trên cả "6304"
  return s + crc16(s);
}
