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
      className="pb-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pb-modal__box" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={box}>
        <div className="pb-modal__head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="pb-modal__x" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div>{children}</div>
        {actions ? <div className="pb-modal__acts">{actions}</div> : null}
      </div>
    </div>
  );
}
