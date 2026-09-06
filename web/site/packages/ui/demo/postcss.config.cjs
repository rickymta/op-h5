// Ba app chép nguyên phần `plugins` dạng gọn:
//
//     module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
//
// Trang mẫu này phải chỉ đường tới `tailwind.config.cjs` vì Tailwind tìm cấu hình từ **cwd**,
// mà trang mẫu hay được chạy từ `web/`. Trong app thì npm đặt cwd = thư mục app nên không cần.
const path = require("node:path");

module.exports = {
  plugins: {
    tailwindcss: { config: path.join(__dirname, "tailwind.config.cjs") },
    autoprefixer: {},
  },
};
