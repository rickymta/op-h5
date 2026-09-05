import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "./cx";

export type ToastMsg = { text: string; err?: boolean };

/** Thông báo ngắn ở đáy màn hình cho kết quả thao tác; tự tắt sau 2,6 s. Lỗi cần đọc kỹ thì dùng Msg. */
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

export function Toast({ toast }: { toast: ToastMsg | null }) {
  return (
    <div className={cx("pb-toast", toast && "is-show", toast?.err && "pb-toast--err")} role="status" aria-live="polite">
      {toast?.text ?? ""}
    </div>
  );
}
