// Ngân hàng phổ biến + mã BIN NAPAS (VietQR). img.vietqr.io nhận BIN trực tiếp.
export const BANKS: { bin: string; name: string }[] = [
  { bin: "970436", name: "Vietcombank (VCB)" },
  { bin: "970407", name: "Techcombank (TCB)" },
  { bin: "970422", name: "MB Bank (MB)" },
  { bin: "970416", name: "ACB" },
  { bin: "970418", name: "BIDV" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970405", name: "Agribank" },
  { bin: "970432", name: "VPBank" },
  { bin: "970403", name: "Sacombank (STB)" },
  { bin: "970423", name: "TPBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970437", name: "HDBank" },
  { bin: "970448", name: "OCB" },
  { bin: "970443", name: "SHB" },
  { bin: "970426", name: "MSB" },
];

export function bankName(bin?: string | null): string {
  return BANKS.find((b) => b.bin === bin)?.name ?? bin ?? "—";
}

/**
 * URL ảnh VietQR (miễn phí, img.vietqr.io) — encode TK + số tiền + nội dung CK.
 * Trả null nếu thiếu ngân hàng/số tài khoản (chưa cấu hình ở Cài đặt).
 */
export function vietQrUrl(opts: {
  bin?: string | null;
  account?: string | null;
  accountName?: string | null;
  amount?: number;
  addInfo?: string;
}): string | null {
  if (!opts.bin || !opts.account) return null;
  const params = new URLSearchParams();
  if (opts.amount && opts.amount > 0) params.set("amount", String(Math.round(opts.amount)));
  if (opts.addInfo) params.set("addInfo", opts.addInfo);
  if (opts.accountName) params.set("accountName", opts.accountName);
  const qs = params.toString();
  return `https://img.vietqr.io/image/${opts.bin}-${opts.account}-compact2.png${qs ? `?${qs}` : ""}`;
}
