import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@op/ui/publisher.css";
import "./game.css";
import { ApiError } from "./api";
import { App } from "./App";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // Thử lại một lần khi mất mạng; lỗi nghiệp vụ (401/404…) thì không — hỏi lại cũng vậy.
      retry: (count, err) => count < 1 && !(err instanceof ApiError && err.status < 500),
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
