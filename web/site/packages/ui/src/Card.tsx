import type { ReactNode } from "react";
import { cx } from "./cx";

/** Thẻ nền `ink-850`, viền 1 px, bo 12 px. `pad="lg"` cho khối nổi bật (số dư ví). */
export function Card({
  children,
  className,
  pad = "md",
}: {
  children: ReactNode;
  className?: string;
  pad?: "md" | "lg";
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-line bg-ink-850",
        pad === "lg" ? "p-5 tb:px-[30px] tb:py-7" : "p-4 tb:px-[22px] tb:py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
