import type { Band } from "./types";

/** Dải tải máy chủ: Mượt/Đông/Đầy (ok/warn/danger) — nhãn do server trả, không dịch lại ở đây. */
export function BandPill({ band, label }: { band: Band; label: string }) {
  return <span className={`pb-pill pb-pill--${band}`}>{label}</span>;
}
