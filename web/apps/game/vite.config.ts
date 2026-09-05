import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApi } from "../../scripts/mock-api.mjs";

// Xuat thang vao platform/cmd/<svc>/dist de Go nhung bang go:embed (xem apps/ops/vite.config.ts).

export default defineConfig({
  plugins: [react(), mockApi(["/api/", "/auth/"])],
  build: {
    outDir: "../../../platform/cmd/adapter/dist",
    emptyOutDir: false,
    assetsDir: "app",
    sourcemap: false,
    target: "es2022",
  },
  server: {
    port: 5175,
    proxy: Object.fromEntries(["/api/", "/auth/"].map((p) => [p.replace(/\/$/, ""), "http://127.0.0.1:8090"])),
  },
});
