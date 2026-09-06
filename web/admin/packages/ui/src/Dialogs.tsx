import type { FormEvent, ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";

export interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  maxWidth?: "sm" | "md" | "lg";
  children: ReactNode;
}

/**
 * Hộp thoại biểu mẫu. Bọc `<form>` thật nên Enter trong ô chữ là gửi — người trực nhập
 * hàng chục biểu mẫu một ca, bắt họ rời bàn phím đi tìm nút là mất thời gian vô ích.
 *
 * Trong lúc `busy` thì không đóng được bằng Esc hay bấm ra ngoài: đóng giữa chừng một lệnh
 * ghi làm người ta tưởng đã huỷ, trong khi máy chủ vẫn chạy tiếp.
 */
export function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel = "Lưu",
  busy,
  error,
  maxWidth = "sm",
  children,
}: FormDialogProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onSubmit();
  };
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{ paper: { component: "form", onSubmit: submit } }}
    >
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {children}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Huỷ
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  confirmLabel?: string;
}

/** Hỏi lại trước thao tác không lùi được. `danger` đổi nút sang đỏ. */
export function ConfirmDialog({
  open,
  title,
  message,
  danger,
  onClose,
  onConfirm,
  busy,
  confirmLabel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        {typeof message === "string" ? (
          <DialogContentText>{message}</DialogContentText>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Huỷ
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={danger ? "error" : "primary"}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirmLabel ?? (danger ? "Xoá" : "Đồng ý")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
