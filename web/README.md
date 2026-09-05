# Giao diện React

Ba app cùng một workspace, mỗi app được **nhúng thẳng vào binary Go** bằng `go:embed`.
Không có container riêng, không cần Node lúc chạy. Kế hoạch đầy đủ: [docs/plan-go-react.md](../docs/plan-go-react.md).

| App | Nhúng vào | Đường | Trạng thái |
|---|---|---|---|
| `apps/ops` | `platform/cmd/admin/dist` | trang quản trị (loopback) | Đơn mua, GM, Game (đủ trường giới thiệu), Nhân viên, Người chơi, Tài khoản, Tin tức |
| `apps/portal` | `platform/cmd/id/dist` | trang chính + cổng tài khoản | xong 2026-09-06 (`ID_SPA=1`), chưa chạy với Go thật |
| `apps/game` | `platform/cmd/adapter/dist` | trang game (một bundle cho mọi game) | xong 2026-09-06 (`ADAPTER_SPA=1`), chưa chạy với Go thật |

## Lệnh

```bash
cd web
npm ci                # lần đầu
npm run typecheck     # tsc cho từng project
npm run build         # -> platform/cmd/admin/dist
npm run dev:ops       # Vite dev server :5173, proxy /api sang admin đang chạy ở :8100
npm run dev:portal    # :5174, proxy sang id :8080;  npm run dev:game → :5175, proxy sang adapter :8090
VITE_MOCK=1 npm run dev -w @op/portal   # không cần backend: trả src/mock/<đường>.json (scripts/mock-api.mjs)
```

## Hai điều dễ vấp

1. **`dist/.gitkeep` phải còn.** `//go:embed all:dist` không biên dịch được nếu thư mục
   trống hoàn toàn, nên `npm run build` gọi `scripts/clean-dist.mjs` (giữ `.gitkeep`) thay
   vì dùng `emptyOutDir` của Vite.
2. **Bản build không nằm trong git.** CI chạy `npm ci && npm run build` **trước** khi build
   image Go. Quên bước đó thì binary nhúng thư mục rỗng và trang quản trị trả 503 kèm
   hướng dẫn — không chết im lặng.

## Bật/tắt

`ADMIN_SPA=1`, `ID_SPA=1`, `ADAPTER_SPA=1` trong `docker/.env`: từng dịch vụ dùng React, trang Go cũ
lui về tiền tố `/cu/`. Bỏ cờ là về nguyên trạng. Hai bản dùng chung API và chung phiên đăng nhập.
`dev-macos.sh` bật cả ba; compose mặc định tắt `ID_SPA`/`ADAPTER_SPA` cho tới khi chạy thật.

## Ngân sách

App người chơi ≤ 120 KB gzip (game chủ yếu chơi trên điện thoại). Đo 2026-09-06: `ops` 87 KB, `portal` 87 KB + 6 KB CSS, `game` 81 KB + 5 KB CSS.
Vượt ngân sách thì đổi sang Preact + `preact/compat`: sửa alias trong `vite.config.ts`, mã
React giữ nguyên.
