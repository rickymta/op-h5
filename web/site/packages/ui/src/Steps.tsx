import { cx } from "./cx";

/**
 * Thanh bước 1→N cho luồng mua: Chọn gói → Nhân vật → Xác nhận → Nhận hàng.
 *
 * `current` **đếm từ 1**: bước nhỏ hơn `current` là đã xong (tô đỏ, hiện dấu ✓), bước bằng
 * `current` là đang làm (viền đỏ), còn lại là xám. `current = 0` nghĩa là chưa bắt đầu bước
 * nào; giá trị ngoài khoảng bị kẹp lại nên trang không vỡ khi API trả số lạ.
 *
 * Cả thanh là `<ol>` để trình đọc màn hình biết đây là chuỗi có thứ tự; bước đang làm mang
 * `aria-current="step"`. Điện thoại: thu nhỏ, cuộn ngang **trong khung riêng** (`no-scrollbar`)
 * nên trang không sinh cuộn ngang.
 */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  const cur = Math.max(0, Math.min(Math.round(current) || 0, steps.length));
  return (
    <div className="no-scrollbar overflow-x-auto tb:overflow-hidden">
      <ol className="m-0 flex min-w-[280px] list-none items-start p-0 tb:min-w-0">
        {steps.map((s, i) => {
          const n = i + 1;
          const state = n < cur ? "done" : n === cur ? "cur" : "next";
          const lit = state !== "next";
          return (
            <li
              className={cx(
                "relative flex min-w-0 flex-1 flex-col items-center gap-1.5 px-[3px] text-center tb:gap-2 tb:px-1.5",
                // Đường nối chạy từ tâm bước trước sang tâm bước này; bước đầu không có.
                "before:absolute before:-left-1/2 before:right-1/2 before:top-3 before:h-0.5 before:content-[''] first:before:content-none tb:before:top-[15px]",
                lit ? "before:bg-brand-500" : "before:bg-line",
              )}
              key={`${s}-${i}`}
              aria-current={state === "cur" ? "step" : undefined}
            >
              <span
                className={cx(
                  "relative z-10 inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 font-mono text-xs tb:h-8 tb:w-8 tb:text-[13px]",
                  // Nền đặc để đường nối không chạy xuyên qua vòng tròn.
                  state === "done"
                    ? "border-brand-500 bg-brand-500 text-white"
                    : state === "cur"
                      ? "border-brand-500 bg-ink-900 text-brand-500"
                      : "border-line bg-ink-900 text-fg-muted",
                )}
                aria-hidden="true"
              >
                {state === "done" ? "✓" : n}
              </span>
              <span
                className={cx(
                  "text-[11.5px] leading-snug [overflow-wrap:anywhere] tb:text-[13px]",
                  state === "cur" ? "font-semibold text-fg" : "text-fg-muted",
                )}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
