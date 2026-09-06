// Điểm vào của công cụ GM. Phục vụ ở admin.<domain>/gm nên mọi đường phải tính từ tiền tố
// đó: Vite dựng tài sản với `base: "/admin-portal/"`, còn wouter được đặt `base="/admin-portal"` ở đây một lần —
// nhờ vậy trong app viết `/nhan-vat`, không ai phải nhớ gõ `/gm/nhan-vat`.
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { AdminApp } from "@op/admin-ui";
import { App } from "./App";
import { ChonProvider } from "./chon";

createRoot(document.getElementById("root")!).render(
  <AdminApp>
    <Router base="/admin-portal">
      <ChonProvider>
        <App />
      </ChonProvider>
    </Router>
  </AdminApp>,
);
