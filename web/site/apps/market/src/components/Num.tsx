import { formatInt } from "@op/site-ui";
import { PRICE_UNIT } from "../lib/market";

/** Số Xu. `tone="gold"` cho thành tiền và số thực nhận — mốc tiền dùng vàng đồng. */
export function Xu({ n, tone }: { n: number; tone?: "gold" | "muted" }) {
  const color = tone === "gold" ? "text-gold-400" : tone === "muted" ? "text-fg-muted" : "text-fg";
  return (
    <span className={`whitespace-nowrap font-mono nums ${color}`}>
      {formatInt(n)} <span className="text-fg-faint">Xu</span>
    </span>
  );
}

/** Số Nguyên Bảo. */
export function NB({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap font-mono nums text-fg">
      {formatInt(n)} <span className="text-fg-faint">NB</span>
    </span>
  );
}

/** Đơn giá: Xu cho mỗi 1.000 Nguyên Bảo. Đơn vị viết nhỏ để cột không bị dài. */
export function UnitPrice({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap font-mono nums text-fg">
      {formatInt(n)}
      <span className="text-fg-faint"> Xu/{formatInt(PRICE_UNIT)}</span>
    </span>
  );
}
