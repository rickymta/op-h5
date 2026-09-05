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
    <section className="pb-section" id={id}>
      {hasHead ? (
        <div className="pb-section__head">
          <div>
            {eyebrow ? <p className="pb-eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {sub ? <p className="pb-sub">{sub}</p> : null}
          </div>
          {action ? <div className="pb-section__action">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
