import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@op/ui/tokens.css";
import "@op/ui/base.css";
import { App } from "./App";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // Trang quan tri doc so lieu song; nhung khong thu lai vo han khi API tra loi
      // nghiep vu (403/404) — chi thu lai loi mang.
      retry: (count, err) => count < 2 && !(err instanceof Error && "status" in err),
      staleTime: 5_000,
      refetchOnWindowFocus: true,
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
