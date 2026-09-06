import type { ReactNode } from "react";

/**
 * Hàng bộ lọc nằm ngay trên bảng (mockup: máy chủ / phương thức / sắp xếp / ô tìm / nút làm mới).
 * `children` là các control — thường là `SearchField` + `SelectField`, mỗi cái tự vẽ nhãn nhỏ
 * phía trên. `action` (nút "Đặt lại", "Làm mới") nằm cuối hàng, canh đáy để thẳng hàng với các
 * control chứ không thẳng với nhãn.
 *
 * Điện thoại: xếp **2 cột** thay vì cuộn ngang — cuộn ngang ở đây làm mất control khỏi tầm mắt.
 * Ô tìm kiếm tự chiếm cả hai cột (`SearchField` gắn class `pb-fctl--wide`).
 */
export function FilterBar({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="pb-filters">
      <div className="pb-filters__row">{children}</div>
      {action ? <div className="pb-filters__act">{action}</div> : null}
    </div>
  );
}
