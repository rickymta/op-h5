/* CommonJS (`.cjs`) vì package này khai `"type": "module"`, còn preset của @op/site-ui là
 * CommonJS — `tailwind.config.js` ở đây sẽ bị Node coi là ESM và `require` ném ERR_REQUIRE_ESM.
 *
 * `content` phải quét cả mã nguồn của @op/site-ui: lớp Tailwind của TopBar, Card, DataTable…
 * nằm trong đó, không phải trong app này. Thiếu dòng ấy thì trang lên nhưng không có kiểu dáng.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@op/site-ui/tailwind-preset")],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};
