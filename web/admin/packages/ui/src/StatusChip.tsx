import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";

export type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

export interface StatusEntry {
  label: string;
  color: ChipColor;
}

/**
 * Trạng thái hay gặp ở cả hai trang quản trị. Truyền `map` để đè hoặc bổ sung.
 *
 * Giá trị lạ không có trong bảng thì hiện nguyên văn với màu xám — thà thấy chuỗi thô còn
 * hơn thấy ô trống khi máy chủ thêm trạng thái mới mà giao diện chưa kịp biết.
 */
export const DEFAULT_STATUS: Record<string, StatusEntry> = {
  // đơn mua
  pending: { label: "Chờ xử lý", color: "warning" },
  granted: { label: "Đã phát", color: "success" },
  failed: { label: "Thất bại", color: "error" },
  refunded: { label: "Đã hoàn", color: "info" },
  // tài khoản / game
  active: { label: "Đang chạy", color: "success" },
  hidden: { label: "Đang ẩn", color: "default" },
  disabled: { label: "Đã khoá", color: "error" },
  locked: { label: "Bị khoá", color: "error" },
  deleted: { label: "Đã xoá", color: "default" },
  // bài viết
  draft: { label: "Bản nháp", color: "default" },
  published: { label: "Đã đăng", color: "success" },
  // vai trò nhân viên
  owner: { label: "Chủ", color: "primary" },
  operator: { label: "Vận hành", color: "info" },
  gm: { label: "GM", color: "secondary" },
  viewer: { label: "Chỉ xem", color: "default" },
};

export interface StatusChipProps {
  value: string;
  map?: Record<string, StatusEntry>;
  size?: "small" | "medium";
}

export function StatusChip({ value, map, size = "small" }: StatusChipProps) {
  const e = map?.[value] ?? DEFAULT_STATUS[value] ?? { label: value || "—", color: "default" as const };
  const tone = e.color;

  // Chip màu đặc của MUI dùng contrastText: chữ tối trên nền rực. Cả một cột như thế thì
  // bảng nhìn như đèn nháy. Ở đây giữ viền và chữ theo màu trạng thái, nền chỉ 16%.
  let sx: SxProps<Theme> = { fontWeight: 600 };
  if (tone !== "default") {
    const key = tone;
    sx = {
      fontWeight: 600,
      borderColor: (t: Theme) => alpha(t.palette[key].main, 0.5),
      color: (t: Theme) => t.palette[key].light,
      backgroundColor: (t: Theme) => alpha(t.palette[key].main, 0.16),
    };
  }

  return <Chip label={e.label} color={tone} size={size} variant="outlined" sx={sx} />;
}
