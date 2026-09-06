// Định dạng số và thời gian cho ba app công khai.
//
// `formatInt` cố ý KHÔNG dùng `toLocaleString("vi-VN")`: kết quả phụ thuộc dữ liệu vùng của
// trình duyệt, nên một máy thiếu locale sẽ hiện "1,234,567" trong khi phía Go (`formatInt`
// trong pages.go) luôn hiện dấu chấm. Hai kiểu số trên cùng một trang là thứ người đọc sẽ
// tưởng là hai đơn vị khác nhau.

/** 1234567 → "1.234.567". Chuỗi không phải số nguyên thì trả nguyên văn. */
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

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/** "05/09/2026" theo giờ máy người xem. */
function dmy(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** RFC 3339 → "05/09/2026 14:03". Chuỗi không đọc được thì trả nguyên. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${dmy(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * "vừa xong", "5 phút trước", "3 giờ trước", "3 ngày trước"; quá 30 ngày (hoặc ở tương lai —
 * tin hẹn giờ) thì hiện ngày "12/08/2026". `now` để test và để một danh sách dài dùng chung
 * một mốc thay vì mỗi dòng gọi `new Date()`.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sec = Math.round((now.getTime() - d.getTime()) / 1000);
  if (sec < 0) return dmy(d);
  if (sec < 45) return "vừa xong";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  if (day <= 30) return `${day} ngày trước`;
  return dmy(d);
}
