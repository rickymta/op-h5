import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "./cx";

export type ToastMsg = { text: string; err?: boolean };

/** Thông báo ngắn ở đáy màn hình cho kết quả thao tác; tự tắt sau 2,6 s. Lỗi cần đọc kỹ thì dùng `Msg`. */
export function useToast(): { toast: ToastMsg | null; show: (t: string, err?: boolean) => void } {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((text: string, err = false) => {
    setToast({ text, err });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show };
}

/**
 * Khung luôn có mặt trong DOM (chỉ đổi độ mờ) để `aria-live` đọc được nội dung mới — nếu
 * gắn/tháo khỏi DOM thì trình đọc màn hình thường bỏ qua.
 */
export function Toast({ toast }: { toast: ToastMsg | null }) {
  return (
    <div
      className={cx(
        "pointer-events-none fixed bottom-5 left-4 right-4 z-60 rounded-lg border border-line bg-ink-850",
        "px-4 py-3 text-sm shadow-toast transition-opacity duration-200",
        "tb:left-1/2 tb:right-auto tb:max-w-[420px] tb:-translate-x-1/2",
        toast ? "opacity-100" : "opacity-0",
        toast?.err ? "border-l-[3px] border-l-danger-500" : "border-l-[3px] border-l-ok-500",
      )}
      role="status"
      aria-live="polite"
    >
      {toast?.text ?? ""}
    </div>
  );
}
