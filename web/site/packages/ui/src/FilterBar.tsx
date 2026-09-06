import { useId, type ReactNode } from "react";

/**
 * Hàng bộ lọc nằm ngay trên bảng (máy chủ / phương thức / sắp xếp / ô tìm / nút làm mới).
 * `children` là các control — thường là `SearchField` + `SelectField`, mỗi cái tự vẽ nhãn nhỏ
 * phía trên. `action` (nút "Đặt lại", "Làm mới") nằm cuối hàng, canh đáy để thẳng hàng với các
 * control chứ không thẳng với nhãn.
 *
 * Điện thoại: xếp **2 cột** thay vì cuộn ngang — cuộn ngang ở đây làm mất control khỏi tầm mắt.
 * Ô tìm kiếm tự chiếm cả hai cột (`SearchField` gắn `col-span-full`).
 */
export function FilterBar({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-[18px] flex flex-wrap items-end gap-2.5 rounded-xl border border-line bg-ink-850 p-3 tb:gap-3 tb:px-4 tb:py-3.5">
      <div className="grid min-w-0 flex-auto grid-cols-2 gap-2.5 tb:flex tb:flex-wrap tb:gap-3">{children}</div>
      {action ? (
        <div className="flex w-full shrink-0 items-end gap-2 tb:w-auto [&>*]:flex-auto tb:[&>*]:flex-none">{action}</div>
      ) : null}
    </div>
  );
}

const CTL = "flex min-w-0 flex-col gap-1.5 tb:flex-[1_1_170px]";
const LABEL = "font-mono text-3xs uppercase tracking-[0.12em] text-fg-muted";

/**
 * Ô chọn có nhãn nhỏ phía trên — dùng trong `FilterBar`. Không tự đặt lựa chọn mặc định: giá
 * trị luôn do trang giữ (controlled), nên nút "Đặt lại" chỉ cần set lại state.
 *
 * `id` tự sinh khi không truyền, để nhãn vẫn gắn đúng ô khi có nhiều bộ lọc trên một trang.
 * Ô cao 44 px và chữ 16 px theo quy tắc chung trong base.css (iOS không tự phóng to).
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  id?: string;
}) {
  const auto = useId();
  const sid = id || auto;
  return (
    <div className={CTL}>
      <label className={LABEL} htmlFor={sid}>
        {label}
      </label>
      <select id={sid} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Ô tìm kiếm cho `FilterBar`. Enter gọi `onSubmit` (nếu có) — không bọc `<form>` vì FilterBar
 * hay nằm sẵn trong một form khác, và form lồng form là HTML sai.
 *
 * `type="search"` để bàn phím điện thoại hiện phím "Tìm"; nút `×` xoá nhanh hiện khi có chữ,
 * rộng 44 px như mọi vùng chạm khác. Nhãn mặc định là "Tìm" nhưng vẫn là `<label>` thật cho
 * trình đọc màn hình chứ không chỉ là placeholder.
 */
export function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder,
  id,
  label = "Tìm",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  id?: string;
  label?: string;
}) {
  const auto = useId();
  const sid = id || auto;
  return (
    <div className={`${CTL} col-span-full tb:flex-[2_1_230px]`}>
      <label className={LABEL} htmlFor={sid}>
        {label}
      </label>
      <div className="relative">
        <input
          id={sid}
          className="no-search-clear pr-11"
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="absolute right-0 top-0 h-touch w-touch rounded-md text-[22px] leading-none text-fg-muted hover:text-fg"
            aria-label="Xoá từ khoá"
            onClick={() => {
              onChange("");
              onSubmit?.();
            }}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
