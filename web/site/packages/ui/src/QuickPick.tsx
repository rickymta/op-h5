import { cx } from "./cx";

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
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            className={cx(
              "inline-flex min-h-touch cursor-pointer items-center justify-center rounded-full border px-4",
              "font-sans text-sm font-medium leading-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
              on ? "border-brand-500 bg-ink-800 text-fg" : "border-line bg-transparent text-fg-muted hover:border-fg-muted hover:text-fg",
            )}
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
