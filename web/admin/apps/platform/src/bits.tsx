import { useState } from "react";
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ApiError } from "@op/admin-ui";

/** Thông điệp đọc được từ bất kỳ thứ gì react-query hay `catch` trả về. */
export function loiText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e ?? "Lỗi không rõ.");
}

/** Dải lỗi của một truy vấn. Không có lỗi thì không chiếm chỗ. */
export function Loi({ e, sx }: { e: unknown; sx?: object }) {
  if (!e) return null;
  return (
    <Alert severity="error" sx={{ mb: 2, ...sx }}>
      {loiText(e)}
    </Alert>
  );
}

/**
 * Endpoint chưa có ở phía Go.
 *
 * Trang cũ của hai mục Gói và Nhật ký là template Go render sẵn, không đi qua API; bản React
 * cần một `GET` để đọc danh sách mà tiến trình `admin` chưa có. Thay vì để trang trắng với
 * một dòng "Lỗi HTTP 404", nói thẳng thiếu cái gì để người trực biết đây không phải hỏng.
 */
export function ThieuAPI({ path, viec }: { path: string; viec: string }) {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>Máy chủ chưa có {path}</AlertTitle>
      {viec} Các thao tác ghi trên trang này vẫn chạy vì chúng dùng endpoint đã có.
    </Alert>
  );
}

/** Ô chọn có/không dạng công tắc kèm dòng giải thích bên dưới. */
export function Cong({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Box>
      <FormControlLabel
        control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />}
        label={label}
      />
      {hint && <FormHelperText sx={{ ml: 0 }}>{hint}</FormHelperText>}
    </Box>
  );
}

/** Nhãn nhỏ trên một khối trong form dài. */
export function Muc({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: "block", mt: 1, letterSpacing: ".08em" }}
    >
      {children}
    </Typography>
  );
}

// ---------------------------------------------------------------- ảnh

/** Ảnh có thể ghi tương đối so với trang game (vd `/assets/images/logo.png`). Trang quản trị
 *  chạy ở gốc khác nên phải ghép với `site_url` mới xem trước được; đường khác thì không thử. */
export function anhTuyetDoi(url: string, site: string): string {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/") && site) return site.replace(/\/+$/, "") + u;
  return "";
}

/** Ô 48px: ảnh nếu tải được, "—" khi chưa có, "lỗi" khi URL không tải được. */
export function XemTruoc({ src }: { src: string }) {
  const [hong, setHong] = useState("");
  const khung = {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 1,
    border: "1px solid",
    borderColor: "divider",
    objectFit: "cover" as const,
    bgcolor: "background.default",
  };
  if (!src || hong === src) {
    return (
      <Box
        sx={{
          ...khung,
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          color: src ? "error.main" : "text.disabled",
        }}
        aria-hidden="true"
      >
        {src ? "lỗi" : "—"}
      </Box>
    );
  }
  return <Box component="img" sx={khung} src={src} alt="" onError={() => setHong(src)} />;
}

/** Ô nhập URL ảnh kèm xem trước. `site` để ghép URL tương đối. */
export function OAnh({
  label,
  hint,
  value,
  site,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  site: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <TextField
        label={label}
        helperText={hint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        size="small"
        fullWidth
        autoComplete="off"
      />
      <Box sx={{ pt: 0.5 }}>
        <XemTruoc src={anhTuyetDoi(value, site)} />
      </Box>
    </Box>
  );
}
