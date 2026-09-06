// Cấu hình mẫu cho ba app. Bản app chép nguyên phần dưới, chỉ đổi đường dẫn `content`:
//
//     module.exports = {
//       presets: [require("@op/site-ui/tailwind-preset")],
//       content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
//     };
//
// CommonJS (`.cjs`) có chủ ý — app khai `"type": "module"` nên `tailwind.config.js` sẽ bị Node
// đọc như ESM và `require` không tồn tại. Đuôi `.cjs` cũng nằm trong danh sách Tailwind tìm.
//
// Trang mẫu này ghi đường dẫn tuyệt đối vì glob của `content` được tính từ **cwd**, mà trang
// mẫu hay được chạy từ `web/`. App chạy bằng npm workspace thì cwd = thư mục app, dùng
// đường dẫn tương đối như trên là đủ.
const path = require("node:path");
const p = (...s) => path.join(__dirname, ...s);

module.exports = {
  presets: [require("../tailwind-preset")],
  // Bắt buộc có đường dẫn tới mã của @op/site-ui: class nằm trong file .tsx của gói,
  // Tailwind không quét thì trang ra trắng trơn mà không báo lỗi gì.
  content: [p("index.html"), p("*.tsx"), p("..", "src", "**", "*.{ts,tsx}")],
};
