// Chen dau cham phan cach hang nghin: 1234567 -> "1.234.567".
//
// Khong dung toLocaleString('vi-VN'): ket qua phu thuoc du lieu vung cua trinh duyet, nen
// mot may thieu locale se hien "1,234,567" trong khi phia Go (pages.go formatInt) luon hien
// dau cham. Hai kieu so tren cung mot trang la thu nguoi doc se tuong la hai don vi khac nhau.
export function formatInt(n: number | bigint | string): string {
  const s = typeof n === "string" ? n : String(n);
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  if (!/^\d+$/.test(digits)) return s;
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }
  return neg ? "-" + out : out;
}
