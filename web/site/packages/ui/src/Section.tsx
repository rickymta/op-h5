import type { ReactNode } from "react";

/** Một khối nội dung: eyebrow nhỏ, tiêu đề, dòng phụ, và `action` bên phải ("Xem tất cả"). */
export function Section({
  eyebrow,
  title,
  sub,
  action,
  children,
  id,
}: {
  eyebrow?: string;
  title?: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const hasHead = eyebrow || title || sub || action;
  return (
    <section className="pt-8 tb:pt-12" id={id}>
      {hasHead ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          <div>
            {eyebrow ? (
              <p className="mb-1.5 font-mono text-[11.5px] uppercase tracking-[0.16em] text-brand-500">{eyebrow}</p>
            ) : null}
            {title ? <h2>{title}</h2> : null}
            {sub ? <p className="mt-1 text-sm text-fg-muted">{sub}</p> : null}
          </div>
          {/* Liên kết "Xem tất cả →" cũng là vùng chạm: cao đủ 44 px dù chữ nhỏ. */}
          {action ? (
            <div className="inline-flex shrink-0 items-center [&>a]:inline-flex [&>a]:min-h-touch [&>a]:items-center [&>button]:inline-flex [&>button]:min-h-touch [&>button]:items-center">
              {action}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
