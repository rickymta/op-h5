import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@op/ui/publisher.css";
import "./portal.css";
import { App } from "./App";
import { ApiError } from "./api";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // Lỗi nghiệp vụ (401/404/409…) thử lại không đổi được gì; chỉ thử lại lỗi mạng, một lần.
      retry: (count, err) => count < 1 && !(err instanceof ApiError),
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
