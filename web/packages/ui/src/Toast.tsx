import { useCallback, useRef, useState } from "react";

/** Thong bao ngan o goc man hinh. Dung cho ket qua thao tac, khong dung cho loi can doc ky. */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((text: string, bad = false) => {
    setMsg({ text, bad });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return { toast: msg, show };
}

export function Toast({ toast }: { toast: { text: string; bad: boolean } | null }) {
  return (
    <div id="toast" className={toast ? `show${toast.bad ? " bad" : ""}` : ""} role="status" aria-live="polite">
      {toast?.text ?? ""}
    </div>
  );
}
