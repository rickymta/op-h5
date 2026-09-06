import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export type ToastSeverity = "success" | "error" | "info" | "warning";

export interface ToastApi {
  show: (msg: string, sev?: ToastSeverity) => void;
}

// Ngoài `ToastProvider` thì `show` chỉ ghi console. Lý do: một thành phần lẻ đem ra kiểm thử
// hay dựng thử trong Storybook không được ném lỗi chỉ vì thiếu provider — thông báo ngắn là
// thứ mất đi cũng không hỏng việc.
const Ctx = createContext<ToastApi>({
  show: (msg: string, sev: ToastSeverity = "info") => {
    // eslint-disable-next-line no-console
    console.info(`[toast:${sev}] ${msg}`);
  },
});

/** Thông báo ngắn ở đáy màn hình. Dùng cho kết quả thao tác, không dùng cho lỗi cần đọc kỹ. */
export function useToast(): ToastApi {
  return useContext(Ctx);
}

interface Msg {
  key: number;
  text: string;
  sev: ToastSeverity;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<Msg | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((text: string, sev: ToastSeverity = "success") => {
    setMsg({ key: Date.now(), text, sev });
    setOpen(true);
  }, []);

  const value = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Snackbar
        key={msg?.key ?? 0}
        open={open}
        autoHideDuration={msg?.sev === "error" ? 8000 : 4000}
        onClose={(_, reason) => {
          // Bấm ra ngoài không nên nuốt mất thông báo lỗi người ta chưa kịp đọc.
          if (reason === "clickaway") return;
          setOpen(false);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={msg?.sev ?? "info"}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ minWidth: 280, maxWidth: 560 }}
        >
          {msg?.text ?? ""}
        </Alert>
      </Snackbar>
    </Ctx.Provider>
  );
}
