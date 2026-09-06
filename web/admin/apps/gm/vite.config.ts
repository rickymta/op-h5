import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApi } from "../../../scripts/mock-api.mjs";

// Xuat vao platform/cmd/adapter/dist-gm: giao dien GM phuc vu tai
// haitac.<domain>/admin-portal, tuc CUNG tien trinh voi API GM (internal/gmops chay trong
// Adapter cua tung game) va cung cookie `haitac_adm`. Dat o admin:8100/gm thi SPA se phai
// goi API khac origin va khac cookie — khong chay duoc.
export default defineConfig({
  plugins: [react(), mockApi(["/api/"])],
  base: "/admin-portal/",
  build: {
    outDir: "../../../../platform/cmd/adapter/dist-gm",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
  },
  server: { port: 5274, proxy: { "/admin-portal": "http://127.0.0.1:8090", "/api": "http://127.0.0.1:8090" } },
});
