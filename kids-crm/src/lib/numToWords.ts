// Đọc số tiền VND ra chữ tiếng Việt (cho dòng "Bằng chữ" trên hóa đơn).
const ONES = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const UNIT = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function readGroup(n: number, full: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const dv = n % 10;
  const out: string[] = [];
  if (tram > 0 || full) out.push(ONES[tram], "trăm");
  if (chuc === 0) {
    if (dv > 0 && (tram > 0 || full)) out.push("lẻ", ONES[dv]);
    else if (dv > 0) out.push(ONES[dv]);
  } else if (chuc === 1) {
    out.push("mười");
    if (dv === 5) out.push("lăm");
    else if (dv > 0) out.push(ONES[dv]);
  } else {
    out.push(ONES[chuc], "mươi");
    if (dv === 1) out.push("mốt");
    else if (dv === 5) out.push("lăm");
    else if (dv > 0) out.push(ONES[dv]);
  }
  return out.join(" ");
}

/** vd 318000 → "Ba trăm mười tám nghìn đồng chẵn." */
export function readVnd(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Không đồng.";
  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const full = i !== groups.length - 1;
    parts.push((readGroup(groups[i], full) + (UNIT[i] ? ` ${UNIT[i]}` : "")).trim());
  }
  let s = parts.join(" ").replace(/\s+/g, " ").trim();
  s = s.charAt(0).toUpperCase() + s.slice(1) + " đồng";
  if (groups[0] === 0) s += " chẵn"; // tròn nghìn
  return s + ".";
}
