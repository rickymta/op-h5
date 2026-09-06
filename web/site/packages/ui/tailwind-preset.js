/* Bảng màu và thang đo dùng chung cho ba app công khai (portal, chợ, trang game).
 *
 * CommonJS có chủ ý: `tailwind.config.cjs` của app nạp bằng
 * `presets: [require("@op/site-ui/tailwind-preset")]`. Vì thế package này KHÔNG khai
 * `"type": "module"` — nếu khai, Node coi file `.js` là ESM và `require` sẽ ném ERR_REQUIRE_ESM.
 *
 * Màu chép nguyên từ hợp đồng tái cấu trúc mục 4. Đừng sửa giá trị ở đây mà không sửa hợp đồng:
 * bốn gói (ui + ba app) đọc chung bảng này, lệch một mã màu là lệch cả trang.
 */

/** Điểm ngắt lấy đúng từ bộ CSS cũ: quy tắc `max-width: 720px` ↔ mọi thứ dưới `tb`. */
const screens = {
  // “điện thoại rộng / bảng nhỏ” — cũ là @media (max-width: 560px)
  xs: "561px",
  // “máy tính bảng trở lên” — cũ là @media (max-width: 720px)
  tb: "721px",
};

const colors = {
  ink: {
    950: "#06080B",
    900: "#0B0F14",
    850: "#111823",
    800: "#18212E",
    700: "#222E3E",
    // 8 chữ số: đã có alpha sẵn, dùng cho lớp phủ mỏng. Không dùng với `/50`.
    600: "#31415580",
  },
  line: { DEFAULT: "#263240", soft: "#1B2430" },
  brand: {
    50: "#FFF1ED",
    300: "#FF9276",
    400: "#FF6A4A",
    500: "#EE4623",
    600: "#C4381B",
    700: "#992A13",
  },
  gold: { 400: "#E5BC63", 500: "#D9A945", 600: "#B0871F" },
  ok: { 400: "#54C9B1", 500: "#3FB89F", bg: "#0F2F2A" },
  warn: { 400: "#E8B65A", 500: "#E0A63F", bg: "#2E2411" },
  danger: { 400: "#E8806F", 500: "#E0685A", bg: "#331A18" },
  fg: { DEFAULT: "#F2F5F7", muted: "#9AA9B7", faint: "#68788A" },
};

/** Chỉ stack hệ thống — CSP đặt `font-src 'self'`, mọi font tải từ Internet sẽ bị chặn im lặng. */
const fontFamily = {
  sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
  mono: ["ui-monospace", "SFMono-Regular", '"SF Mono"', "Menlo", "Consolas", '"Liberation Mono"', "monospace"],
};

/** Vài tiện ích Tailwind không có sẵn; gói trong plugin để app không phải chép CSS. */
function extras({ addUtilities }) {
  addUtilities({
    // Hàng cuộn ngang trong khung riêng (thanh bước, dải ô số liệu) — giấu thanh cuộn
    // để nó không ăn mất 15 px chiều cao trên máy tính bàn.
    ".no-scrollbar": {
      "scrollbar-width": "none",
      "-ms-overflow-style": "none",
      "&::-webkit-scrollbar": { display: "none" },
    },
    // Chữ số cùng bề rộng. Tailwind có sẵn `tabular-nums` nhưng nó cần đi kèm
    // `font-variant-numeric` gốc; lớp này đặt thẳng, dùng được một mình.
    ".nums": { "font-variant-numeric": "tabular-nums" },
    // Ẩn nút "x" mặc định của <input type="search"> — đã có nút riêng rộng 44 px.
    ".no-search-clear": {
      "&::-webkit-search-cancel-button": { "-webkit-appearance": "none", appearance: "none" },
    },
  });
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      screens,
      colors,
      fontFamily,
      fontSize: {
        // Cỡ chữ nhỏ của nhãn mono in hoa (header bảng, eyebrow, mã máy chủ).
        "3xs": ["10.5px", { lineHeight: "1.4" }],
        "2xs": ["11px", { lineHeight: "1.4" }],
      },
      borderRadius: {
        // Ghi bằng px cho khỏi phụ thuộc cỡ chữ gốc của trình duyệt.
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
      },
      maxWidth: {
        // Bề rộng nội dung của cả ba app; thanh trên, hero và chân trang dùng chung.
        content: "1180px",
      },
      spacing: {
        // Chiều cao thanh trên — cột trái dính (sticky) căn theo mốc này.
        topbar: "60px",
        // Vùng chạm tối thiểu; viết `min-h-touch` thay vì nhớ con số.
        touch: "44px",
      },
      zIndex: { 60: "60" },
      keyframes: {
        skel: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: { skel: "skel 1.2s linear infinite" },
      boxShadow: {
        sheet: "0 16px 32px rgba(0, 0, 0, 0.45)",
        modal: "0 24px 64px rgba(0, 0, 0, 0.5)",
        toast: "0 12px 32px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [extras],
};
