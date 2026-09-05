import type { ReactNode } from "react";
import { cx } from "./cx";

/** Thẻ nền `--surface`, viền 1 px, bo `--radius-card`. `pad="lg"` cho khối nổi bật (số dư ví). */
export function Card({ children, className, pad = "md" }: { children: ReactNode; className?: string; pad?: "md" | "lg" }) {
  return <div className={cx("pb-card", pad === "lg" && "pb-card--lg", className)}>{children}</div>;
}
