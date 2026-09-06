import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export interface LoginCardProps {
  title: string;
  sub?: string;
  onSubmit: (u: string, p: string) => void;
  busy?: boolean;
  error?: string | null;
  /** Ghi chú dưới nút, ví dụ nhắc liên hệ ai khi quên mật khẩu. */
  footer?: ReactNode;
}

/**
 * Thẻ đăng nhập giữa màn hình, dùng chung cho cả hai trang quản trị.
 *
 * Mật khẩu giữ trong state ở đây chứ không đẩy lên cha: trang cha chỉ cần biết lúc bấm gửi,
 * và mỗi phím gõ làm cả cây trang render lại là thứ không đổi lấy được gì.
 */
export function LoginCard({ title, sub, onSubmit, busy, error, footer }: LoginCardProps) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onSubmit(u.trim(), p);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 380 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Box sx={{ width: 8, height: 26, borderRadius: 1, bgcolor: "primary.main" }} />
            <Typography variant="h5" component="h1">
              {title}
            </Typography>
          </Box>
          {sub && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {sub}
            </Typography>
          )}

          <Box component="form" onSubmit={submit} noValidate>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Tên đăng nhập"
                value={u}
                onChange={(e) => setU(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={busy}
              />
              <TextField
                label="Mật khẩu"
                type="password"
                value={p}
                onChange={(e) => setP(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={busy || !u || !p}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                Đăng nhập
              </Button>
            </Stack>
          </Box>

          {footer && (
            <Box sx={{ mt: 3, color: "text.secondary", fontSize: "0.8125rem" }}>{footer}</Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
