# Giao diện

Hai nhóm tách hẳn nhau, **không import chéo**: nhóm quản trị dùng MUI, nhóm công khai dùng
Tailwind. Mỗi trang là một app riêng với bundle riêng, nhúng thẳng vào binary Go bằng
`go:embed`; không có container hay cổng nào thêm.

| App | Gói | Nhúng vào | Địa chỉ |
|---|---|---|---|
| `admin/apps/platform` | `@op/admin-platform` | `platform/cmd/admin/dist` | `admin.<domain>` |
| `admin/apps/gm` | `@op/admin-gm` | `platform/cmd/adapter/dist-gm` | `haitac.<domain>/admin-portal` |
| `site/apps/portal` | `@op/site-portal` | `platform/cmd/id/dist` | `<domain>`, `id.<domain>` |
| `site/apps/market` | `@op/site-market` | `platform/cmd/id/dist-market` | `<domain>/cho` |
| `site/apps/haitac` | `@op/site-haitac` | `platform/cmd/adapter/dist` | `haitac.<domain>` |

Hai gói dùng chung: `admin/packages/ui` (`@op/admin-ui`) và `site/packages/ui` (`@op/site-ui`).

**Vì sao công cụ GM nằm trong Adapter chứ không trong trang quản trị**: mọi thao tác GM đi
qua console của cụm game đó, API tương ứng chạy trong Adapter và dùng cookie riêng. Đặt
bundle ở tiến trình khác thì trình duyệt không gửi cookie. Game thêm sau có cổng GM riêng
ở tên miền của nó.

## Lệnh

```bash
cd web
npm ci                    # lần đầu
npm run typecheck         # tsc cho cả bảy project
npm run build             # dựng cả năm app vào platform/cmd/*/dist*
npm run dev:portal        # :5275 — còn dev:admin :5273, dev:gm :5274, dev:market :5276, dev:haitac :5277
VITE_MOCK=1 npm run dev -w @op/site-portal   # không cần backend: trả src/mock/<đường>.json
```

## Ba điều dễ vấp

1. **`dist*/.gitkeep` phải còn.** `//go:embed all:dist` không biên dịch được với thư mục
   trống hoàn toàn, nên `npm run build` gọi `scripts/clean-dist.mjs` thay vì `emptyOutDir`.
2. **Bản build không nằm trong git.** CI chạy `npm ci && npm run build` **trước** khi dựng
   image, và có một bước chặn image rỗng: thiếu `index.html` là CI dừng. Ngày 06/09 ba image
   đẩy lên với `dist` rỗng, binary vẫn chạy nên không ai biết cho tới khi mở trang.
3. **Cấu hình Tailwind của app phải là `.cjs`** (app khai `"type": "module"`, còn preset là
   CommonJS), và `content` phải trỏ cả `../../packages/ui/src/**` — thiếu thì trang ra trắng
   mà Tailwind không báo gì.

## Ngân sách

Công khai ≤ 120 KB gzip JS và ≤ 20 KB CSS mỗi app; quản trị ≤ 400 KB (MUI nặng, chạy nội bộ).
Đo 2026-09-06: portal 96,7 + 8,0 · haitac 93,1 + 7,7 · chợ 77,5 + 7,5 · quản trị 311,8 · GM 301,6.
