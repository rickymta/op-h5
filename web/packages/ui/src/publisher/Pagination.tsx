import { cx } from "./cx";

/**
 * Phân trang số: `‹ 1 … 4 5 6 … 20 ›`. Luôn hiện trang đầu, trang cuối, trang hiện tại và hai
 * hàng xóm; phần bị bỏ thay bằng `…`. Trang hiện tại tô `--accent` và mang `aria-current="page"`.
 *
 * Một trang hoặc ít hơn thì không vẽ gì (CSS `:empty` giấu cả khung) — trang không có chỗ trống
 * lơ lửng dưới bảng.
 */
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const total = Math.max(0, Math.round(pages) || 0);
  const cur = Math.min(Math.max(1, Math.round(page) || 1), Math.max(1, total));
  const go = (p: number) => {
    if (p >= 1 && p <= total && p !== cur) onChange(p);
  };

  return (
    <nav className="pb-pager" aria-label="Phân trang">
      {total > 1 ? (
        <>
          <button type="button" className="pb-pager__b pb-pager__b--arrow" onClick={() => go(cur - 1)} disabled={cur <= 1} aria-label="Trang trước">
            ‹
          </button>
          {pageItems(cur, total).map((it, i) =>
            it === "gap" ? (
              <span className="pb-pager__gap" key={`g${i}`} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                type="button"
                key={it}
                className={cx(
                  "pb-pager__b",
                  it === cur && "is-on",
                  // Hàng xóm của trang hiện tại: màn hình rất hẹp giấu đi để cả dải vừa một
                  // dòng (‹ 1 … 7 … 20 ›). Chỉ giấu khi đã rút gọn, tức là còn `…` dẫn đường.
                  total > 7 && it !== 1 && it !== total && it !== cur && "is-near",
                )}
                aria-current={it === cur ? "page" : undefined}
                aria-label={`Trang ${it}`}
                onClick={() => go(it)}
              >
                {it}
              </button>
            ),
          )}
          <button type="button" className="pb-pager__b pb-pager__b--arrow" onClick={() => go(cur + 1)} disabled={cur >= total} aria-label="Trang sau">
            ›
          </button>
        </>
      ) : null}
    </nav>
  );
}

/** Dãy số trang đã rút gọn. Tối đa 7 ô số nên vừa một dòng ở 375 px. */
function pageItems(cur: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "gap")[] = [1];
  const from = Math.max(2, cur - 1);
  const to = Math.min(total - 1, cur + 1);
  if (from > 2) out.push("gap");
  for (let p = from; p <= to; p++) out.push(p);
  if (to < total - 1) out.push("gap");
  out.push(total);
  return out;
}
