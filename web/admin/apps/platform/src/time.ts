// Đổi qua lại giữa RFC 3339 (API) và giá trị của <input type="datetime-local"> (giờ máy).
//
// Không dùng toISOString(): nó luôn ra UTC, người trực nhập 14:00 giờ Việt Nam sẽ thành
// 07:00 trên trang công khai. Ở đây giữ múi giờ của trình duyệt trong chuỗi gửi đi.

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-09-05T14:03" (giờ máy) → "2026-09-05T14:03:00+07:00". Không hợp lệ → "". */
export function localToRFC3339(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const off = -d.getTimezoneOffset();
  const a = Math.abs(off);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${off >= 0 ? "+" : "-"}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
  );
}

/** RFC 3339 → "YYYY-MM-DDTHH:mm" theo giờ máy, để đổ vào datetime-local. Rỗng/hỏng → "". */
export function rfc3339ToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** RFC 3339 → "05/09/2026 14:03" theo giờ máy. Rỗng → "—"; không đọc được → in nguyên. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
