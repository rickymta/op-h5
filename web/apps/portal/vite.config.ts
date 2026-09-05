import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApi } from "../../scripts/mock-api.mjs";

// Xuat thang vao platform/cmd/<svc>/dist de Go nhung bang go:embed (xem apps/ops/vite.config.ts).

export default defineConfig({
  plugins: [react(), mockApi(["/api/", "/oauth/"])],
  build: {
    outDir: "../../../platform/cmd/id/dist",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
  },
  server: {
    port: 5174,
    proxy: Object.fromEntries(["/api/", "/oauth/"].map((p) => [p.replace(/\/$/, ""), "http://127.0.0.1:8080"])),
  },
});
