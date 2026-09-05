import { BandPill } from "./BandPill";
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
    <div className="pb-srv">
      <div className="pb-srv__name">
        <span className="pb-srv__nm">{name}</span>
        <span className="pb-srv__code">{code}</span>
        {recommend ? <span className="pb-srv__rec">Gợi ý</span> : null}
      </div>
      <div className="pb-srv__online">{online} người</div>
      <div>
        <BandPill band={band} label={label} />
      </div>
    </div>
  );
}
