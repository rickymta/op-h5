# Giao diện React

Ba app cùng một workspace, mỗi app được **nhúng thẳng vào binary Go** bằng `go:embed`.
Không có container riêng, không cần Node lúc chạy. Kế hoạch đầy đủ: [docs/plan-go-react.md](../docs/plan-go-react.md).

| App | Nhúng vào | Đường | Trạng thái |
|---|---|---|---|
| `apps/ops` | `platform/cmd/admin/dist` | trang quản trị (loopback) | giai đoạn 0: mới có trang Đơn mua |
| `apps/portal` | `platform/cmd/id/dist` | trang chính + cổng tài khoản | chưa làm — **ưu tiên hiện tại**, xem plan mục 15 |
| `apps/game` | `platform/cmd/adapter/dist` | trang game (một bundle cho mọi game) | chưa làm — **ưu tiên hiện tại**, xem plan mục 15 |

## Lệnh

```bash
cd web
npm ci                # lần đầu
npm run typecheck     # tsc cho từng project
npm run build         # -> platform/cmd/admin/dist
npm run dev:ops       # Vite dev server :5173, proxy /api sang admin đang chạy ở :8100
```

## Hai điều dễ vấp

1. **`dist/.gitkeep` phải còn.** `//go:embed all:dist` không biên dịch được nếu thư mục
   trống hoàn toàn, nên `npm run build` gọi `scripts/clean-dist.mjs` (giữ `.gitkeep`) thay
   vì dùng `emptyOutDir` của Vite.
2. **Bản build không nằm trong git.** CI chạy `npm ci && npm run build` **trước** khi build
   image Go. Quên bước đó thì binary nhúng thư mục rỗng và trang quản trị trả 503 kèm
   hướng dẫn — không chết im lặng.

## Bật/tắt

`ADMIN_SPA=1` trong `docker/.env`: trang quản trị dùng React, trang Go cũ lui về tiền tố
`/cu/`. Bỏ cờ là về nguyên trạng. Hai bản dùng chung API và chung phiên đăng nhập.

## Ngân sách

App người chơi ≤ 120 KB gzip (game chủ yếu chơi trên điện thoại). Hiện `ops` là 82 KB gzip (đo 2026-09-05).
Vượt ngân sách thì đổi sang Preact + `preact/compat`: sửa alias trong `vite.config.ts`, mã
React giữ nguyên.
