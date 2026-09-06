import Box from "@mui/material/Box";
import { formatInt } from "./format";

export interface MoneyProps {
  xu: number;
  /** Hiện dấu "+" cho số dương (dùng cho sổ biến động, không dùng cho số dư). */
  sign?: boolean;
  /** Thêm đuôi " xu". Mặc định tắt vì bảng thường đã có tên cột. */
  unit?: boolean;
}

/**
 * Số tiền: "1.234.567", chữ số đơn cách để cột thẳng hàng, màu theo dấu.
 *
 * Số âm luôn đỏ — trừ tiền là thứ không được lẫn với cộng tiền dù bảng nào. Số dương chỉ tô
 * xanh khi `sign` bật, vì trên bảng số dư thì tô xanh cả cột chẳng nói thêm điều gì.
 */
export function Money({ xu, sign, unit }: MoneyProps) {
  const n = Number.isFinite(xu) ? xu : 0;
  const color = n < 0 ? "error.main" : sign && n > 0 ? "success.main" : "text.primary";
  const text = (sign && n > 0 ? "+" : "") + formatInt(n);
  return (
    <Box
      component="span"
      sx={{ color, fontVariantNumeric: "tabular-nums", fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {text}
      {unit && (
        <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
          {" xu"}
        </Box>
      )}
    </Box>
  );
}
