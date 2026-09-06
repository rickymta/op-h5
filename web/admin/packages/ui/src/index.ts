// @op/admin-ui — nền MUI dùng chung cho hai trang quản trị (nền tảng và GM).
//
// Chữ ký của mọi thứ xuất ở đây là hợp đồng: hai app import đúng tên và props này. Thêm
// props tuỳ chọn thì được, đổi hay bỏ props đã có thì không.
//
// Nhóm quản trị dùng MUI, nhóm công khai (`@op/site-ui`) dùng Tailwind. **Không import
// chéo giữa hai nhóm** — đó là yêu cầu của người vận hành, không phải thói quen.

export { theme, fontFamily, numericStyle } from "./theme";

export { AdminApp } from "./AdminApp";
export type { AdminAppProps } from "./AdminApp";

export { Shell } from "./Shell";
export type { ShellProps, NavItem } from "./Shell";

export { Page } from "./Page";
export type { PageProps, Crumb } from "./Page";

export { Grid } from "./Grid";
export type { GridProps, AdminColDef } from "./Grid";

export { FormDialog, ConfirmDialog } from "./Dialogs";
export type { FormDialogProps, ConfirmDialogProps } from "./Dialogs";

export { StatusChip, DEFAULT_STATUS } from "./StatusChip";
export type { StatusChipProps, StatusEntry, ChipColor } from "./StatusChip";

export { Money } from "./Money";
export type { MoneyProps } from "./Money";

export { useToast, ToastProvider } from "./Toast";
export type { ToastApi, ToastSeverity } from "./Toast";

export { LoginCard } from "./LoginCard";
export type { LoginCardProps } from "./LoginCard";

export { api, ApiError, errText } from "./api";

export { formatInt, formatDate, timeAgo } from "./format";

// Tiện cho app: khỏi phải khai báo `@mui/x-data-grid` chỉ để lấy kiểu cột.
export type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
