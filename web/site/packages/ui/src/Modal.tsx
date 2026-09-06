import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Hộp thoại: overlay tối, đóng khi bấm nền hoặc Esc, khoá cuộn body lúc mở, focus chuyển vào
 * hộp. Điện thoại: hộp dán đáy màn hình, nút hành động giãn đều. Không có `open` thì không render.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    // Trả focus về chỗ cũ khi đóng để người dùng bàn phím không bị rơi về đầu trang.
    const prevFocus = document.activeElement as HTMLElement | null;
    box.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/[.78] p-0 backdrop-blur-[4px] tb:items-center tb:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[calc(100dvh-24px)] w-full overflow-auto rounded-t-xl border border-line bg-ink-850 px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px] shadow-modal focus:outline-none tb:max-h-[calc(100dvh-32px)] tb:max-w-[440px] tb:rounded-xl tb:p-[22px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={box}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id={titleId} className="m-0 text-lg">
            {title}
          </h3>
          <button
            type="button"
            className="-mb-2 -mr-2.5 -mt-2 h-touch w-touch shrink-0 rounded-lg border-0 bg-transparent text-[22px] leading-none text-fg-muted hover:bg-ink-800 hover:text-fg"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
        {actions ? (
          <div className="mt-5 flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto tb:[&>*]:flex-none">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
