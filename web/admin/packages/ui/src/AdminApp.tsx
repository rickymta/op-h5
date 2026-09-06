import { useState } from "react";
import type { ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "./theme";
import { ToastProvider } from "./Toast";

export interface AdminAppProps {
  children: ReactNode;
  /** Chỉ truyền khi app cần cấu hình riêng (ví dụ tắt cache lúc kiểm thử). */
  client?: QueryClient;
}

/**
 * Vỏ ngoài cùng của cả hai trang quản trị: theme + CssBaseline + react-query + Toast.
 *
 * `retry: 1` thay cho mặc định 3: đây là mạng nội bộ, gọi lại ba lần chỉ kéo dài thời gian
 * người trực nhìn màn hình trống trước khi thấy lỗi thật. `refetchOnWindowFocus` tắt vì
 * người trực chuyển cửa sổ liên tục và bảng nhảy dữ liệu giữa lúc đọc là phiền hơn là lợi.
 */
export function AdminApp({ children, client }: AdminAppProps) {
  const [fallback] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={client ?? fallback}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
