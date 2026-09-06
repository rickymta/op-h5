import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `import.meta.url` thay cho `node:url`: cây này không cài `@types/node`, và một dòng
// `fileURLToPath` không đáng để kéo thêm gói kiểu chỉ cho một file cấu hình.
const here = new URL(".", import.meta.url).pathname;

// Bản dựng thử của riêng gói nền: không xuất vào `platform/`, chỉ để xem thành phần bằng mắt
// và để đo dung lượng gzip — trần là 400 KB JS cho mỗi app quản trị, MUI chiếm phần lớn con
// số đó nên hai agent app cần biết trước khi thêm thư viện.
export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: { "@op/admin-ui": new URL("../src/index.ts", import.meta.url).pathname },
  },
  server: { port: 5278, strictPort: true },
  preview: { port: 5278, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true, target: "es2022", sourcemap: false },
});
