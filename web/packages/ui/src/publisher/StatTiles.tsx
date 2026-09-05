import { cx } from "./cx";

/**
 * Ô số liệu thật (game đang mở, đang chơi, máy chủ đang mở). Số bằng chữ mono to, nhãn in hoa
 * nhỏ. Điện thoại: đúng 3 ô thì 3 cột nhỏ; từ 4 ô trở lên thành một hàng cuộn ngang — không
 * bao giờ xếp thành một cột dài. `value` đã định dạng sẵn (formatInt) để ô không phải đoán.
 */
export function StatTiles({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className={cx("pb-stats", items.length > 3 && "pb-stats--scroll")}>
      {items.map((it) => (
        <div className="pb-stat" key={it.label}>
          <div className="pb-stat__v">{it.value}</div>
          <div className="pb-stat__k">{it.label}</div>
          {it.hint ? <div className="pb-stat__h">{it.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
