import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApi } from "../../../scripts/mock-api.mjs";

// Xuat thang vao platform/cmd/id/dist de Go nhung bang go:embed.
export default defineConfig({
  plugins: [react(), mockApi(["/api/"])],
  base: "/",
  build: {
    outDir: "../../../../platform/cmd/id/dist",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
  },
  server: { port: 5275, proxy: { "/api": "http://127.0.0.1:8080" } },
});
