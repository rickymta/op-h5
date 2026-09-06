import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "@op/admin-ui";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp>
      <App />
    </AdminApp>
  </StrictMode>,
);
