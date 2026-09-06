import { createTheme } from "@mui/material/styles";
import type { CSSProperties } from "react";

// Thêm biến thể chữ `num` cho mọi con số (tiền, ID, số lượng).
//
// Chữ tỉ lệ làm cột số nhảy lung tung giữa các dòng, mắt không so hàng được; `tabular-nums`
// ép mọi chữ số rộng bằng nhau nên cột thẳng hàng mà không cần đổi sang font mono.
declare module "@mui/material/styles" {
  interface TypographyVariants {
    num: CSSProperties;
  }
  interface TypographyVariantsOptions {
    num?: CSSProperties;
  }
}
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    num: true;
  }
}

/**
 * Stack hệ thống — **tuyệt đối không nạp font ngoài**.
 *
 * CSP của tiến trình `admin` có `font-src 'self'`; một `<link>` tới Google Fonts sẽ bị chặn
 * im lặng và trang rơi về font mặc định của trình duyệt, tức là công sức nạp font đổi lấy
 * một lần chớp chữ. Stack dưới đây đã có sẵn trên mọi máy người trực dùng.
 */
export const fontFamily =
  'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Số liệu: cùng stack chữ nhưng ép chữ số đơn cách để cột thẳng hàng. */
export const numericStyle: CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1',
};

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#EE4623", light: "#FF6A4A", dark: "#C4381B", contrastText: "#FFFFFF" },
    secondary: { main: "#D9A945", light: "#E5BC63", dark: "#B0871F", contrastText: "#0B0F14" },
    background: { default: "#0B0F14", paper: "#131A22" },
    divider: "#263240",
    text: { primary: "#F2F5F7", secondary: "#9AA9B7", disabled: "#68788A" },
    success: { main: "#3FB89F", light: "#54C9B1", dark: "#2E8C78", contrastText: "#06231E" },
    warning: { main: "#E0A63F", light: "#E8B65A", dark: "#A87A26", contrastText: "#231A06" },
    error: { main: "#E0685A", light: "#E8806F", dark: "#A84539", contrastText: "#2A0F0B" },
    info: { main: "#57A6D9", light: "#7BBCE4", dark: "#3A7BA6", contrastText: "#06161F" },
    action: { hover: "rgba(242,245,247,0.06)", selected: "rgba(238,70,35,0.16)" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily,
    fontSize: 14,
    h1: { fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h2: { fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontSize: "1.4rem", fontWeight: 700 },
    h4: { fontSize: "1.25rem", fontWeight: 700 },
    h5: { fontSize: "1.15rem", fontWeight: 700 },
    h6: { fontSize: "1rem", fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
    num: { ...numericStyle, fontSize: "0.875rem" },
  },
  components: {
    // Chế độ tối của MUI phủ một lớp `backgroundImage` lên Paper theo độ nổi. Ở bảng màu
    // này nó làm thẻ ngả xám, lệch hẳn khỏi #131A22 đã chốt — tắt đi, dùng viền để phân lớp.
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: "#263240" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "default" },
      styleOverrides: {
        root: {
          backgroundColor: "#131A22",
          backgroundImage: "none",
          borderBottom: "1px solid #263240",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: "#0E141B", backgroundImage: "none", borderRight: "1px solid #263240" },
      },
    },
    MuiCard: { defaultProps: { variant: "outlined" } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiTableCell: { styleOverrides: { root: { borderColor: "#263240" } } },
    MuiChip: { styleOverrides: { label: { fontWeight: 600 } } },
    MuiTypography: {
      defaultProps: {
        variantMapping: { num: "span" },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        // Thanh cuộn mặc định của Chrome ở chế độ tối vẫn sáng trắng trên nền #0B0F14.
        "*": { scrollbarColor: "#31415580 transparent" },
        "input[type=number]": { MozAppearance: "textfield" },
      },
    },
  },
});
