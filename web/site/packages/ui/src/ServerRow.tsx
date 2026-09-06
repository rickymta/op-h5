import { BandPill } from "./Badge";
import type { Band } from "./types";

/**
 * Một hàng máy chủ: tên + mã, số người đang chơi, dải Mượt/Đông/Đầy. Xếp nhiều hàng trong một
 * `<Card>`; hàng cuối không có gạch dưới. Dưới 560 px tên chiếm cả dòng, số người và dải xuống
 * dòng dưới — không tràn màn hình. `online` đã định dạng sẵn (formatInt).
 */
export function ServerRow({
  name,
  code,
  online,
  band,
  label,
  recommend,
}: {
  name: string;
  code: string;
  online: string;
  band: Band;
  label: string;
  recommend?: boolean;
}) {
  return (
    <div className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line py-3 last:border-b-0 xs:grid-cols-[minmax(0,1fr)_auto_auto] xs:gap-x-3.5 xs:gap-y-2 xs:py-[13px]">
      <div className="col-span-full min-w-0 [overflow-wrap:anywhere] xs:col-span-1">
        <span className="font-semibold">{name}</span>
        <span className="ml-2 font-mono text-xs text-fg-muted">{code}</span>
        {recommend ? (
          <span className="ml-2 inline-block rounded-sm border border-gold-500 px-1.5 py-px align-[1px] font-mono text-3xs uppercase tracking-[0.06em] text-gold-400">
            Gợi ý
          </span>
        ) : null}
      </div>
      <div className="min-w-0 whitespace-nowrap text-left font-mono text-[12.5px] nums text-fg-muted xs:min-w-[78px] xs:text-right">
        {online} người
      </div>
      <div>
        <BandPill band={band} label={label} />
      </div>
    </div>
  );
}
