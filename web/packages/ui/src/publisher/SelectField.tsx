import { useId } from "react";

/**
 * Ô chọn có nhãn nhỏ phía trên — dùng trong `FilterBar`. Không tự đặt lựa chọn mặc định: giá
 * trị luôn do trang giữ (controlled), nên nút "Đặt lại" chỉ cần set lại state.
 *
 * `id` tự sinh khi không truyền, để nhãn vẫn gắn đúng ô khi có nhiều bộ lọc trên một trang.
 * Ô cao 44 px và chữ 16 px theo quy tắc chung trong publisher.css (iOS không tự phóng to).
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
    <div className="pb-fctl">
      <label className="pb-fctl__l" htmlFor={sid}>
        {label}
      </label>
      <select id={sid} className="pb-fctl__in" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
