import { useId } from "react";

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
    <div className="pb-fctl pb-fctl--wide">
      <label className="pb-fctl__l" htmlFor={sid}>
        {label}
      </label>
      <div className="pb-search">
        <input
          id={sid}
          className="pb-fctl__in pb-search__in"
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
            className="pb-search__x"
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
