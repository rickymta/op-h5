/**
 * Nhóm nút pill chọn nhanh: mốc Nguyên Bảo, bộ lọc nhanh, hoặc chọn nhân vật khi ít lựa chọn
 * (từ 5 lựa chọn trở lên nên dùng `SelectField` cho gọn).
 *
 * Là `<button>` thật chứ không phải radio ẩn: bấm một cái đổi ngay, không cần nhãn `for`.
 * Trạng thái chọn báo bằng `aria-pressed` — trình đọc màn hình đọc "đã bấm". `role="group"`
 * kèm `ariaLabel` để người dùng biết nhóm này chọn cái gì.
 */
export function QuickPick({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="pb-quick" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            className={on ? "pb-quick__b is-on" : "pb-quick__b"}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
