// Định dạng số và thời gian cho trang công khai. `formatInt` dùng chung với bảng ops
// (dấu chấm phân cách hàng nghìn, không phụ thuộc locale của trình duyệt).
export { formatInt } from "../format";

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
