/* Tailwind của trang game (haitac.antfarms.xyz).
 *
 * `.cjs` có chủ ý: package.json của app khai `"type": "module"`, nên một file `.js` sẽ bị coi
 * là ESM và `require` bên dưới ném ERR_REQUIRE_ESM.
 *
 *
 * `content` phải quét cả `site/packages/ui/src`: thành phần dùng chung được nạp từ mã nguồn
 * (không qua bước build), nên lớp Tailwind của chúng chỉ sinh ra khi app này nhìn thấy.
 */
const preset = require("@op/site-ui/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};
