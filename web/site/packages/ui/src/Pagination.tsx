import { cx } from "./cx";

const BTN =
  "inline-flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-md border border-line " +
  "bg-transparent px-1.5 font-mono text-sm font-medium leading-none text-fg nums transition-colors duration-150 " +
  "hover:enabled:border-gold-400 hover:enabled:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40 tb:px-2.5";

/**
 * Phân trang số: `‹ 1 … 4 5 6 … 20 ›`. Luôn hiện trang đầu, trang cuối, trang hiện tại và hai
 * hàng xóm; phần bị bỏ thay bằng `…`. Trang hiện tại tô đỏ và mang `aria-current="page"`.
 *
 * Một trang hoặc ít hơn thì không vẽ gì — trang không có chỗ trống lơ lửng dưới bảng.
 */
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const total = Math.max(0, Math.round(pages) || 0);
  const cur = Math.min(Math.max(1, Math.round(page) || 1), Math.max(1, total));
  if (total <= 1) return null;

  const go = (p: number) => {
    if (p >= 1 && p <= total && p !== cur) onChange(p);
  };

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang">
      <button type="button" className={cx(BTN, "text-[19px]")} onClick={() => go(cur - 1)} disabled={cur <= 1} aria-label="Trang trước">
        ‹
      </button>
      {pageItems(cur, total).map((it, i) =>
        it === "gap" ? (
          <span className="min-w-[22px] text-center text-fg-muted" key={`g${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            type="button"
            key={it}
            className={cx(
              BTN,
              it === cur && "border-brand-500 bg-brand-500 text-white hover:enabled:border-brand-500 hover:enabled:text-white",
              // 375 px không đủ chỗ cho 9 ô 44 px: giấu hai trang hàng xóm, còn `‹ 1 … 7 … 20 ›`
              // vừa đúng một dòng. Dấu `…` vẫn ở đó nên người đọc biết còn trang bị bỏ qua.
              total > 7 && it !== 1 && it !== total && it !== cur && "hidden tb:inline-flex",
            )}
            aria-current={it === cur ? "page" : undefined}
            aria-label={`Trang ${it}`}
            onClick={() => go(it)}
          >
            {it}
          </button>
        ),
      )}
      <button type="button" className={cx(BTN, "text-[19px]")} onClick={() => go(cur + 1)} disabled={cur >= total} aria-label="Trang sau">
        ›
      </button>
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
