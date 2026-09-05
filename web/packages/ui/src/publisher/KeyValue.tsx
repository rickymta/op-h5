import type { ReactNode } from "react";
import { cx } from "./cx";

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
  rows: { k: string; v: ReactNode; strong?: boolean; tone?: "accent" | "brass" }[];
}) {
  return (
    <dl className="pb-kv">
      {rows.map((r, i) => (
        <div className={cx("pb-kv__r", r.strong && "is-strong")} key={`${r.k}-${i}`}>
          <dt className="pb-kv__k">{r.k}</dt>
          <dd className={cx("pb-kv__v", r.tone && `pb-kv__v--${r.tone}`)}>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}
