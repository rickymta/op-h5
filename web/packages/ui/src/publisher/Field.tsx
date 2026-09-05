import type { ReactNode } from "react";

/** Nhãn + ô nhập (bản publisher, cùng props với `@op/ui` Field). Nhãn gắn ô qua `htmlFor`. */
export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="pb-field">
      <label className="pb-field__label" htmlFor={htmlFor}>
        {label}
        {hint ? <span className="pb-field__hint">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
