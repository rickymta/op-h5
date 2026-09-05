import type { ReactNode } from "react";

export type PillTone = "ok" | "warn" | "crit" | "unknown";

export function Pill({ tone = "unknown", children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
