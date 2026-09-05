import { cx } from "./cx";

/**
 * Thanh bước 1→N cho luồng mua: Chọn gói → Nhân vật → Xác nhận → Nhận hàng.
 *
 * `current` **đếm từ 1**: bước nhỏ hơn `current` là đã xong (tô `--accent`, hiện dấu ✓), bước
 * bằng `current` là đang làm (viền `--accent`), còn lại là xám. `current = 0` nghĩa là chưa
 * bắt đầu bước nào; giá trị ngoài khoảng bị kẹp lại nên trang không vỡ khi API trả số lạ.
 *
 * Cả thanh là `<ol>` để trình đọc màn hình biết đây là chuỗi có thứ tự; bước đang làm mang
 * `aria-current="step"`. Điện thoại: thu nhỏ, cuộn ngang **trong khung riêng**.
 */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  const cur = Math.max(0, Math.min(Math.round(current) || 0, steps.length));
  return (
    <div className="pb-steps__wrap">
      <ol className="pb-steps">
        {steps.map((s, i) => {
          const n = i + 1;
          const state = n < cur ? "done" : n === cur ? "cur" : "next";
          return (
            <li className={cx("pb-step", `is-${state}`)} key={`${s}-${i}`} aria-current={state === "cur" ? "step" : undefined}>
              <span className="pb-step__n" aria-hidden="true">
                {state === "done" ? "✓" : n}
              </span>
              <span className="pb-step__t">{s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
