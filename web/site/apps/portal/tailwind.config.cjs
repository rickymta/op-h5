/** @type {import('tailwindcss').Config} */
// Bảng màu, phông và bo góc nằm ở preset dùng chung của @op/site-ui (hợp đồng mục 4) — app chỉ
// khai báo quét file nào. Phải quét cả `src` của gói UI vì class Tailwind nằm trong mã của gói
// đó chứ không phải trong app; thiếu dòng này thì trang ra trắng trơn mà không báo lỗi.
//
// Đuôi `.cjs` có chủ ý: package.json của app khai `"type": "module"`, nên `tailwind.config.js`
// sẽ bị Node coi là ESM và `require` dưới đây ném ERR_REQUIRE_ESM.
module.exports = {
  presets: [require("@op/site-ui/tailwind-preset")],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};
