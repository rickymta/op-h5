import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Trang mẫu (style guide) của bảng "publisher" — chỉ để tự kiểm bằng mắt, không app nào
// import thư mục demo/ nên không làm tăng bundle. Chạy từ bất kỳ đâu:
//   npx vite --config web/packages/ui/demo/vite.config.ts     (cổng 5176)
// `root` lấy theo vị trí file này để không phụ thuộc cwd.
const root = decodeURIComponent(new URL(".", import.meta.url).pathname);

export default defineConfig({
  root,
  plugins: [react()],
  server: { port: 5176, strictPort: true },
  build: { outDir: "../../../../build/ui-demo", emptyOutDir: true },
});
