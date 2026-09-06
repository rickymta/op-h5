import type { ReactNode } from "react";
import { cx } from "./cx";
import { Empty } from "./Msg";

export type Column<T> = {
  key: string;
  title: string;
  align?: "left" | "right" | "center";
  /** Bề rộng cột ở máy tính bàn, ví dụ "120px" hoặc "22%". Điện thoại bỏ qua. */
  width?: string;
  /** Ẩn hẳn cột này ở điện thoại — dành cho cột phụ (mô tả dài, ngày giờ đầy đủ). */
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
};

/**
 * Bảng dữ liệu — thành phần trung tâm của bố cục (bảng dày, số canh phải, nút đỏ ở cột cuối).
 *
 * Máy tính bàn (≥ 721 px): `<table>` thật, header chữ mono in hoa nhỏ, dòng sáng lên khi rê chuột.
 *
 * Dưới 720 px **mỗi dòng thành một thẻ**: `thead` thu về `sr-only`, mỗi ô thành một dòng
 * "nhãn cột — giá trị" (nhãn in ra ngay trong ô, `tb:hidden`), cột `hideOnMobile` biến mất.
 * Cách này quan trọng vì bảng 5 cột ở 375 px hoặc phải cuộn ngang cả trang, hoặc phải bóp chữ
 * đến mức không đọc được — cả hai đều hỏng. Khung ngoài chỉ cho cuộn ngang **từ `tb` trở lên**,
 * nên ở điện thoại trang không bao giờ sinh thanh cuộn ngang.
 *
 * `loading` vẽ 3 dòng xương thay vì chữ "Đang tải…" — khung không nhảy khi dữ liệu về.
 * `rows` rỗng (và không loading) thì thay cả bảng bằng ô `empty`; giữ lại header trống không
 * giúp được gì cho người đọc.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  loading,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  // Ô cuối cùng CÒN HIỆN ở điện thoại phải bỏ gạch dưới. `last:` của CSS không dùng được vì
  // ô cuối có thể là ô đã bị `hidden`, và gạch dưới sẽ treo lơ lửng dưới đáy thẻ.
  let lastVisible = -1;
  columns.forEach((c, i) => {
    if (!c.hideOnMobile) lastVisible = i;
  });

  const cellCx = (c: Column<T>, i: number) =>
    cx(
      c.hideOnMobile ? "hidden tb:table-cell" : "flex tb:table-cell",
      "items-baseline justify-between gap-3 py-2.5 text-right [overflow-wrap:anywhere] border-b border-line",
      i === lastVisible && "border-b-0",
      "tb:border-b tb:px-3.5 tb:py-3 tb:align-middle tb:first:pl-1 tb:last:pr-1",
      c.align === "right" ? "tb:text-right tb:nums" : c.align === "center" ? "tb:text-center" : "tb:text-left",
    );

  const headCx = (c: Column<T>) =>
    cx(
      "whitespace-nowrap border-b border-line px-3.5 pb-2.5 font-mono text-2xs font-medium uppercase",
      "tracking-[0.12em] text-fg-muted first:pl-1 last:pr-1",
      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
    );

  if (!loading && rows.length === 0) {
    return <div className={className}>{typeof empty === "string" || !empty ? <Empty>{empty ?? "Chưa có dữ liệu."}</Empty> : empty}</div>;
  }

  return (
    <div className={cx("w-full tb:overflow-x-auto", className)}>
      <table className="block w-full text-[14.5px] tb:table tb:border-collapse" role="table">
        <thead className="sr-only tb:not-sr-only tb:table-header-group" role="rowgroup">
          <tr role="row" className="tb:table-row">
            {columns.map((c) => (
              <th key={c.key} role="columnheader" scope="col" className={headCx(c)} style={c.width ? { width: c.width } : undefined}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block tb:table-row-group" role="rowgroup">
          {loading
            ? [0, 1, 2].map((i) => (
                <tr
                  className="mb-2.5 block rounded-xl border border-line bg-ink-850 px-3.5 last:mb-0 tb:mb-0 tb:table-row tb:rounded-none tb:border-0 tb:bg-transparent tb:px-0"
                  role="row"
                  key={`skel-${i}`}
                  aria-hidden="true"
                >
                  {columns.map((c, ci) => (
                    <td key={c.key} role="cell" className={cellCx(c, ci)}>
                      <span
                        className={cx(
                          // ink-850 → ink-800 → ink-850, chạy ngang: ghi thẳng mã màu vì
                          // theme() trong giá trị tuỳ ý không đọc được khoá số như `850`.
                          "block h-3 animate-skel rounded-sm bg-[linear-gradient(90deg,#111823_0%,#18212E_50%,#111823_100%)] bg-[length:200%_100%]",
                          ci % 2 ? "w-[46%]" : "w-[72%]",
                          c.align === "right" && "ml-auto",
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  role="row"
                  key={rowKey(row)}
                  className="mb-2.5 block rounded-xl border border-line bg-ink-850 px-3.5 last:mb-0 tb:mb-0 tb:table-row tb:rounded-none tb:border-0 tb:bg-transparent tb:px-0 tb:transition-colors tb:duration-100 tb:hover:bg-ink-800 tb:last:[&>td]:border-b-0"
                >
                  {columns.map((c, ci) => (
                    <td key={c.key} role="cell" className={cellCx(c, ci)}>
                      {/* Nhãn cột chỉ hiện ở khổ thẻ. Không dùng `content: attr(data-label)`
                          vì chữ trong pseudo-element không sao chép được và trình duyệt
                          không xuống dòng ở đó. */}
                      <span className="shrink-0 max-w-[45%] text-left font-mono text-3xs uppercase tracking-[0.1em] text-fg-muted tb:hidden">
                        {c.title}
                      </span>
                      <span className="min-w-0 flex-1 tb:block">{c.render(row)}</span>
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {loading ? <span className="sr-only">Đang tải dữ liệu.</span> : null}
    </div>
  );
}
