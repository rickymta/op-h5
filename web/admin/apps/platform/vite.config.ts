import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApi } from "../../../scripts/mock-api.mjs";

// Xuat thang vao platform/cmd/admin/dist de Go nhung bang go:embed.
export default defineConfig({
  plugins: [react(), mockApi(["/api/"])],
  base: "/",
  build: {
    outDir: "../../../../platform/cmd/admin/dist",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
  },
  server: { port: 5273, proxy: { "/api": "http://127.0.0.1:8100" } },
});
