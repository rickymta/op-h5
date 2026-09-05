import type { ReactNode } from "react";

/** Nhan + o nhap. Nhan gan voi o bang htmlFor de bam vao chu cung focus duoc. */
export function Field({ label, hint, htmlFor, children }: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={htmlFor}>
        {label}
        {hint ? <span className="muted"> {hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
