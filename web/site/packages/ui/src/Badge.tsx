import type { ReactNode } from "react";
import type { Band, Tone } from "./types";

const TONE: Record<Tone, string> = {
  brand: "bg-brand-700/40 text-brand-300",
  gold: "bg-ink-800 text-gold-400",
  ok: "bg-ok-bg text-ok-400",
  warn: "bg-warn-bg text-warn-400",
  danger: "bg-danger-bg text-danger-400",
  muted: "bg-ink-800 text-fg-muted",
};

const PILL =
  "inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] font-mono text-2xs font-medium tracking-[0.04em]";

/** Nhãn tròn nhỏ: thể loại game, trạng thái đơn, "chưa mở"… Mặc định xám. */
export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`${PILL} ${TONE[tone]}`}>{children}</span>;
}

/** Dải tải máy chủ theo `band`; ba dải trạng thái Mượt/Đông/Đầy đã chốt ở hợp đồng mục 4. */
const BAND_TONE: Record<Band, Tone> = { smooth: "ok", busy: "warn", full: "danger", unknown: "muted" };

/** Dải tải máy chủ: Mượt/Đông/Đầy. Nhãn do máy chủ trả, không dịch lại ở đây. */
export function BandPill({ band, label }: { band: Band; label: string }) {
  return <Badge tone={BAND_TONE[band] ?? "muted"}>{label}</Badge>;
}
