import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@op/site-ui/base.css";
import "./market.css";
import { App } from "./App";

// Không có QueryClientProvider: đợt này chợ chỉ dựng giao diện, dữ liệu nằm sẵn trong
// `src/demo-data.ts` nên không có lệnh gọi mạng nào để quản lý.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
