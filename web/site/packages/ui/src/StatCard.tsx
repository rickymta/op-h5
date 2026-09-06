import type { ReactNode } from "react";
import { cx } from "./cx";

/** Màu của con số. Mặc định trắng; `gold` cho tiền, `brand` cho thứ cần chú ý. */
export type StatTone = "default" | "brand" | "gold" | "ok" | "warn";

const TONE: Record<StatTone, string> = {
  default: "text-fg",
  brand: "text-brand-500",
  gold: "text-gold-400",
  ok: "text-ok-400",
  warn: "text-warn-400",
};

/**
 * Một ô số liệu đứng riêng ("Ví của tôi": 4 ô cạnh nhau). Xếp nhiều ô bằng
 * `<div className="site-stat-grid">` — 2 cột ở điện thoại để số tiền dài không bị cắt.
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
    <div className="min-w-0 rounded-xl border border-line bg-ink-850 px-2.5 py-3 xs:px-[18px] xs:py-4">
      <div
        className={cx(
          "truncate font-mono text-xl font-medium leading-tight nums tracking-[-0.03em] xs:text-[28px] xs:tracking-[-0.02em]",
          TONE[tone],
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 font-mono text-3xs uppercase tracking-[0.1em] text-fg-muted xs:text-2xs xs:tracking-[0.14em]">
        {label}
      </div>
      {hint ? <div className="mt-1 text-[12.5px] text-fg-muted">{hint}</div> : null}
    </div>
  );
}

/**
 * Bảng khoá–giá trị cho tóm tắt đơn hàng: khoá xám bên trái, giá trị canh phải. Dòng `strong`
 * (thường là "Số dư sau") có viền trên và chữ to hơn để mắt dừng lại ở đó.
 *
 * Đây là `<dl>` chứ không phải `<table>`: nó là danh sách thuộc tính của **một** đơn, không
 * phải dữ liệu nhiều dòng — nên không cần header cột.
 */
export function KeyValue({
  rows,
}: {
  rows: { k: string; v: ReactNode; strong?: boolean; tone?: "brand" | "gold" }[];
}) {
  return (
    <dl className="m-0">
      {rows.map((r, i) => (
        <div
          className={cx(
            "flex items-baseline justify-between gap-x-5 gap-y-2 border-b border-line py-2.5 last:border-b-0",
            r.strong && "mt-1 border-b-0 border-t border-line pt-3.5",
          )}
          key={`${r.k}-${i}`}
        >
          <dt className={cx("shrink text-sm text-fg-muted", r.strong && "font-semibold text-fg")}>{r.k}</dt>
          <dd
            className={cx(
              "m-0 min-w-0 text-right font-semibold [overflow-wrap:anywhere]",
              r.tone === "brand" && "text-brand-500",
              r.tone === "gold" && "font-mono text-gold-400 nums",
              r.strong && "text-[17px] tb:text-[19px]",
            )}
          >
            {r.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
