import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Trang mẫu của @op/site-ui: dựng đủ mọi thành phần với dữ liệu tiếng Việt để soi bố cục,
// đo bề rộng ở 375 px và đo kích thước gzip làm ngân sách cho ba app.
//
// `root` chốt vào thư mục này (không phải cwd) để chạy được từ bất kỳ đâu:
//   npx vite build --config site/packages/ui/demo/vite.config.ts
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  // Tailwind tìm `tailwind.config.*` từ cwd chứ không từ chỗ đặt postcss.config, nên chỉ đường
  // rõ ràng. Ba app không cần dòng này: npm chạy script với cwd = thư mục app.
  css: { postcss: here },
  build: { outDir: resolve(here, "dist"), emptyOutDir: true, target: "es2022", sourcemap: false },
  plugins: [react()],
  server: { port: 5279, strictPort: true },
  preview: { port: 5279, strictPort: true },
});
