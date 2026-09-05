import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Xuat thang vao platform/cmd/admin/dist de Go nhung bang go:embed. Khong co buoc copy
// rieng: mot buoc it di la mot cho it quen.
//
// dist/ nam trong .gitignore cua platform — CI dung `npm run build` truoc `docker build`.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../../../platform/cmd/admin/dist",
    // Khong dung emptyOutDir: no xoa ca .gitkeep (xem scripts/clean-dist.mjs).
    emptyOutDir: false,
    // Tai san co bam noi dung -> nginx/Go dat duoc cache immutable; index.html thi khong.
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
  },
  server: {
    port: 5173,
    // `npm run dev` goi thang API cua admin dang chay tren may (SSH tunnel 8100).
    proxy: { "/api": "http://127.0.0.1:8100", "/dang-nhap": "http://127.0.0.1:8100" },
  },
});
