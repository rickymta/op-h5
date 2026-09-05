import type { ReactNode } from "react";
import { cx } from "./cx";

export type Column<T> = {
  key: string;
  title: string;
  align?: "left" | "right" | "center";
  /** Bề rộng cột ở desktop, ví dụ "120px" hoặc "22%". Điện thoại bỏ qua. */
  width?: string;
  /** Ẩn hẳn cột này ở điện thoại — dành cho cột phụ (mô tả dài, ngày giờ đầy đủ). */
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
};

/**
 * Bảng dữ liệu — thành phần trung tâm của bố cục mockup (bảng dày, số canh phải, nút đỏ ở cột cuối).
 *
 * Desktop: `<table>` thật, header chữ mono in hoa nhỏ, dòng sáng lên khi rê chuột.
 *
 * Dưới 720 px **mỗi dòng thành một thẻ**: `thead` ẩn, mỗi ô thành một dòng "nhãn cột — giá trị"
 * (nhãn do CSS đọc từ `data-label`, không nhân đôi DOM), cột `hideOnMobile` biến mất. Cách này
 * quan trọng vì bảng 5 cột ở 375 px hoặc phải cuộn ngang cả trang, hoặc phải bóp chữ đến mức
 * không đọc được — cả hai đều hỏng. Vì `display` đổi làm mất ngữ nghĩa bảng ngầm, các `role`
 * được ghi rõ để trình đọc màn hình vẫn thấy đây là bảng.
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
  const cellCx = (c: Column<T>) =>
    cx(c.align === "right" && "is-r", c.align === "center" && "is-c", c.hideOnMobile && "is-hm");

  if (!loading && rows.length === 0) {
    return <div className={cx("pb-empty", className)}>{empty ?? "Chưa có dữ liệu."}</div>;
  }

  return (
    <div className={cx("pb-tbl__wrap", className)}>
      <table className="pb-tbl" role="table">
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((c) => (
              <th key={c.key} role="columnheader" scope="col" className={cellCx(c)} style={c.width ? { width: c.width } : undefined}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {loading
            ? [0, 1, 2].map((i) => (
                <tr className="pb-tbl__skel" role="row" key={`skel-${i}`} aria-hidden="true">
                  {columns.map((c) => (
                    <td key={c.key} role="cell" className={cellCx(c)}>
                      <span className="pb-skel" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr role="row" key={rowKey(row)}>
                  {columns.map((c) => (
                    <td key={c.key} role="cell" className={cellCx(c)} data-label={c.title}>
                      {/* Bọc một lớp: ở điện thoại ô là flex "nhãn — giá trị", nếu render trả
                          nhiều phần tử thì chúng phải là **một** khối, không bị dàn ra hai bên. */}
                      <span className="pb-tbl__v">{c.render(row)}</span>
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {loading ? <span className="pb-sr">Đang tải dữ liệu.</span> : null}
    </div>
  );
}
