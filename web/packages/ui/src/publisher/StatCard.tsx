import { cx } from "./cx";

/** Màu của con số. Mặc định trắng; `brass` cho tiền, `accent` cho thứ cần chú ý. */
export type StatTone = "default" | "accent" | "brass" | "ok" | "warn";

/**
 * Một ô số liệu đứng riêng (mockup "Ví của tôi": 4 ô cạnh nhau). Dùng chung kiểu dáng với
 * `StatTiles` — xếp nhiều ô bằng `<div className="pb-stats">` hoặc lưới của trang.
 * `value` đưa vào đã định dạng sẵn (formatInt) để ô không phải đoán cách hiển thị.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div className="pb-stat">
      <div className={cx("pb-stat__v", tone !== "default" && `pb-stat__v--${tone}`)}>{value}</div>
      <div className="pb-stat__k">{label}</div>
      {hint ? <div className="pb-stat__h">{hint}</div> : null}
    </div>
  );
}
