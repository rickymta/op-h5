# Phương án: chuyển toàn bộ PHP sang Go, giao diện dùng React

Soạn 2026-09-05. Số liệu trong mục 1–2 là **đo được** từ cây hiện tại, không phải ước lượng.

## 1. Hiện trạng tầng PHP

**57 file, 7.906 dòng**, chia sáu cụm:

| Cụm | File | Dòng | Làm gì | Go đã thay |
|---|---|---|---|---|
| `api/` | 13 | 879 | API người chơi, callback thanh toán, cầu nối client | một phần |
| `user/` | 11 | 1.664 | Trang người chơi: tài khoản, nạp tiền, lịch sử, đổi KNB, tích luỹ, web shop | một phần |
| `gmhanglong/` | 12 | 2.484 | Công cụ GM đang dùng: nạp tay, gửi thư, xoá kho đồ, CDK, tích luỹ | chưa |
| `gm/` | 9 | 716 | Công cụ GM cũ, chồng chức năng với trên | chết |
| `adminphp@2024/` | 6 | 1.283 | Bảng doanh thu tự viết | một phần |
| `new/` | 3 | 606 | Lớp trung gian giữa `user/webshop.php` và GM tool | đã bị cửa hàng thay |
| gốc (`play.php`, `hiente.php`, `index.php`) | 3 | 274 | Trang nạp client LayaAir | chưa |

Bên Go đã có bốn dịch vụ chạy được: `id` (OIDC, danh tính, ví Xu), `adapter` (trang game, cổng chặn tải, cửa hàng), `admin` (đội máy chủ, nạp tay, gói, đơn mua), `migrate-legacy`. Giao diện hiện là **19 template `html/template`** trong ba dịch vụ đó.

## 2. Ba đường KHÔNG đổi được — ràng buộc cứng của cả phương án

Quét toàn bộ bundle client 9,2 MB và bytecode 10 JAR, chỉ có đúng ba đường PHP bị đóng cứng:

| Đường | Ai gọi | Nằm ở đâu | Trạng thái |
|---|---|---|---|
| `/api/getSession.php?u=&p=` | client LayaAir | bundle `e228b-0b904-ac44c.js` (obfuscated, không có nguồn) | **còn PHP** |
| `/api/api.php?payid=` | client LayaAir | cùng bundle | đã sang Go (`legacy/check`) |
| `http://hakihuyenthoai.net/api/apisv.php?payid=&user=` | **game server** | bytecode `PayWithTokenMoneyReq` trong `tcg-game.jar` | đã sang Go (`legacy/charge`) |

Thêm một nhóm nữa cũng không đổi được, vì **nhà cung cấp đã đăng ký URL callback**: `/api/cardCallback.php` (thesieutoc.net), `/api/bankCallback.php`, `/api/momoCallback.php`. Đổi đường là mất tiền của người chơi đang nạp.

Cách xử lý đã kiểm chứng ở commit cửa hàng: **giữ nguyên đường, đổi phần chạy phía sau**. nginx trỏ `location = /api/xxx.php` sang Go thay vì php-fpm. Client và JAR không biết gì. Toàn bộ phương án này dựa trên đúng một kỹ thuật đó.

## 3. Kiến trúc đích

```
                    nginx (80/443)
                         │
   ┌─────────────────────┼──────────────────────┬────────────────────┐
   │ tĩnh: res/ sound/   │                      │                    │
   │ spine/ libs/        │                      │                    │
   ▼                     ▼                      ▼                    ▼
 (đĩa)            id  :8080 công khai    adapter :8090         admin :8100
                  ├ OIDC + danh tính     ├ trang game (SPA)    ├ vận hành (SPA)
                  ├ ví Xu + sổ cái       ├ cửa hàng            ├ công cụ GM
                  ├ cổng thanh toán      ├ cổng chặn tải       └ đội máy chủ, gói,
                  │  (thẻ/bank/momo)     ├ /api/getSession.php    đơn mua, nạp tay
                  └ cổng tài khoản (SPA) ├ /api/api.php
                                         ├ /api/apisv.php
                                         └ /play.php
```

Ba SPA React, mỗi cái được **nhúng thẳng vào binary Go** bằng `go:embed`. Không thêm container, không thêm cổng, không cần Node lúc chạy. Số dịch vụ giữ nguyên 3 — chỉ thêm việc cho mỗi cái.

Vì sao gộp công cụ GM vào `admin` thay vì làm dịch vụ thứ tư: cả hai đều chỉ nghe loopback, cùng vào bằng SSH tunnel, cùng cần ghi nhật ký thao tác. Hai trang quản trị với hai mật khẩu khác nhau là thứ người trực sẽ nhầm.

## 4. Công nghệ

| Lớp | Chọn | Vì sao |
|---|---|---|
| Build | **Vite 6** | nhanh, cấu hình ít, xuất tĩnh thuần |
| Khung | **React 19 + TypeScript** | như yêu cầu; TS bắt lỗi khuôn dữ liệu API sớm |
| Định tuyến | **wouter** (~2 KB) | mỗi app 4–8 trang; React Router nặng gấp mười mà không dùng hết |
| Dữ liệu | **TanStack Query** | đã cần: đơn mua tự cập nhật, đội máy chủ, số dư |
| CSS | **CSS thuần + biến sẵn có** | hai bảng màu đã thiết kế và đã sửa cho điện thoại; Tailwind sẽ phải làm lại từ đầu |
| Đóng gói | `go:embed dist` | một binary, một image, không đổi cách triển khai |

**Ngân sách bundle**: app người chơi ≤ 120 KB gzip. Game này chủ yếu chơi trên điện thoại (đã đo và sửa ở khổ 375 px), nên nếu vượt thì đổi sang **Preact + preact/compat** (bớt ~35 KB, sửa 3 dòng cấu hình Vite, mã React giữ nguyên).

## 5. Bố cục thư mục

```
web/                          npm workspace, KHÔNG commit node_modules
├── package.json              scripts: dev, build, lint, typecheck
├── packages/ui/              nút, thẻ, bảng, modal, toast + biến CSS dùng chung
├── apps/portal/              → platform/cmd/id/dist       (công khai)
├── apps/game/                → platform/cmd/adapter/dist  (công khai)
└── apps/ops/                 → platform/cmd/admin/dist    (loopback)

platform/internal/spa/        serve embed.FS: index.html fallback, cache-control,
                              hash asset immutable, index.html no-store
```

CI thêm một bước trước khi build image: `npm ci && npm run build` rồi copy `dist` vào `platform/cmd/*/`. Ba Dockerfile Go không đổi.

## 6. Sáu giai đoạn

Mỗi giai đoạn là một commit độc lập, **triển khai được và lùi được**. Ranh giới giai đoạn là chỗ dừng an toàn: dừng sau bất kỳ giai đoạn nào thì hệ vẫn chạy, chỉ là còn PHP.

### Giai đoạn 0 — Bộ khung (không đổi hành vi người dùng)

- Dựng `web/` workspace, `packages/ui` chép nguyên bộ biến CSS và quy tắc điện thoại từ `shell.html` + `base.html`.
- `platform/internal/spa`: serve `embed.FS`, fallback `index.html`, header cache đúng.
- CI: bước Node trước Docker; cache `node_modules` theo `package-lock.json`.
- Một trang thật để chứng minh đường ống: `/may-chu` bằng React, chạy song song trang Go cũ sau cờ `ADAPTER_SPA=1`.

**Xong khi**: `docker compose up` cho ra trang máy chủ React giống hệt bản Go, tắt cờ thì về bản cũ.

### Giai đoạn 1 — Công cụ GM (giá trị cao nhất)

Đây là chỗ React trả công rõ nhất: `gmhanglong/gm/index.php` là **599 dòng** trộn HTML, jQuery và SQL trong một file; mỗi thao tác là một lần tải lại trang.

- Go trong `admin`: `/api/gm/*` cho nạp tay, gửi thư, truy vấn và xoá kho đồ (`bagType` 1–8, 13), CDK, tích luỹ. Dùng lại `internal/console` đã có.
- Thống nhất tài khoản: gộp `admin_users` vào `gm_users` (migration 0008, 1–2 dòng dữ liệu), một lần đăng nhập, một nhật ký `gm_audit`.
- React `apps/ops`: tra nhân vật, xem kho đồ dạng bảng, gửi thư có xem trước phần quà, CDK, và các trang gói/đơn mua vừa làm.
- nginx: `/adminportal` trỏ sang `admin` thay vì php-fpm.

**Xong khi**: làm được đủ 6 thao tác GM qua giao diện mới, `gm_audit` ghi đủ, `gmhanglong/` và `gm/` bị gỡ khỏi nginx.

### Giai đoạn 2 — Cổng thanh toán

- Go trong `id`: bảng `topup_orders` thay `web.card_log`; đơn thẻ cào gọi thesieutoc.net; ba webhook kiểm chữ ký như hiện tại (`hash_equals`, không phụ thuộc thời gian).
- nginx giữ nguyên ba đường `.php` của webhook, trỏ sang `id`. Ghi rõ trong runbook: **không được đổi ba đường này**.
- Ghi kép trong một tuần: Go ghi `topup_orders`, đồng thời ghi `web.card_log` để đối soát; sau đó bỏ.

**Xong khi**: nạp thẻ và nhận callback bank/momo chạy hết bằng Go, đối chiếu số dư khớp giữa hai bảng trong 7 ngày.

### Giai đoạn 3 — Cổng người chơi

- `apps/portal` (id.domain): đăng ký, đăng nhập, ví, lịch sử giao dịch, đổi mật khẩu, quên mật khẩu, **nạp tiền** (thẻ/bank/momo từ giai đoạn 2).
- `apps/game` (haitac.domain): trang chủ, máy chủ, cửa hàng, cổng vào game.
- `/api/getSession.php` chuyển sang `adapter` — **giữ nguyên đường và khuôn trả về** (`true` / `taoaccmoi` / `lamgiday`), nhưng đối chiếu với `platform.users` thay vì `web.user`.
- Các rewrite cũ `/user-*`, `/act-*`, `/tai-khoan`, `/nap-tien`… trả 301 sang route mới.

**Xong khi**: `user/` và `api/config.php` không còn được nginx trỏ tới; người chơi cũ vào link cũ vẫn tới đúng chỗ.

### Giai đoạn 4 — Trang nạp client

`play.php` hiện gọi `curl` sang adapter rồi nhúng `window.__opAuto`. Chuyển vào adapter là bỏ được một chặng mạng và một chỗ đặt cookie.

- Adapter phục vụ `/play.php` (giữ nguyên đường vì `a3b31` trỏ tới), sinh HTML kèm `__opAuto`, `opBundleV` theo `filemtime`.
- Bỏ `hiente.php`, `index.php`, `ios.html` nếu không còn ai dùng — kiểm bằng access log 7 ngày trước khi bỏ.

### Giai đoạn 5 — Dọn

- Gỡ container `php`, `docker/php/`, `web-entrypoint.sh` phần điền secret PHP.
- Xoá `website/game/{api,user,gm,gmhanglong,adminphp@2024,new,adminhl@2024}`; `website/game` chỉ còn tài nguyên tĩnh của client.
- `mask-secrets.py`: bỏ 27 quy tắc PHP, giữ lại phần server Java.
- nginx `game_site.conf` rút còn: tĩnh + proxy + ba đường tương thích.

**Kết quả**: 7.906 dòng PHP → 0. Một container ít hơn, ~190 MB RAM tiết kiệm, và mọi truy vấn SQL đi qua tham số thay vì nối chuỗi.

## 7. Dữ liệu: 21 bảng `web` đi đâu

| Bảng | Đích |
|---|---|
| `user` | `platform.users` — `migrate-legacy` đã làm |
| `card_log` | `platform.topup_orders` (giai đoạn 2) |
| `log_xu`, `log_nap` | `platform.ledger_entries` — đã có |
| `webshop`, `knb`, `tichluy` | `platform.game_packages` — cửa hàng đã làm |
| `webshop_log`, `tichluy_log` | `platform.game_grants` — đã có |
| `server` | `platform.game_servers` — đã có |
| `admin_user` | `platform.gm_users` (giai đoạn 1) |
| `giftcode`, `gift_log` | `cdks.cdk` giữ nguyên, GM tool đọc trực tiếp |
| `diemdanh` | bỏ (điểm danh web, game đã có điểm danh riêng) |
| `sellcoin`, `sellcoin_log` | **bỏ** — mua bán Xu giữa người chơi, quyết định ở mục 11 |
| `cms` | bỏ (bài viết, 1 file dùng) |
| `setting`, `transaction`, `bot_tele_gram` | **bỏ** — 0 file PHP nào tham chiếu |

## 8. Không port, xoá thẳng

- `gm/` — công cụ GM cũ, mọi chức năng đã có trong `gmhanglong`.
- `adminhl@2024/admtool` (15 MB) — bản build React của GMC-2 do nhà phát hành làm, giao diện tiếng Trung, **không có mã nguồn**. Không sửa được, không dịch được.
- `api/api2.php`, `api/apiapk.php`, `user/indexapk.php`, `user/naptien2.php`, `hiente.php` — bản sao cho APK và cho domain cũ.
- `api/bankQR.php` — file rỗng 0 dòng.

## 9. Rủi ro

1. **Bundle client không có nguồn.** Bất cứ thứ gì client gọi mà mình chưa biết sẽ chỉ lộ ra lúc chạy. Trước mỗi giai đoạn: bật access log đầy đủ 48 giờ, đếm đường thật sự được gọi, rồi mới gỡ.
2. **Webhook của bên thứ ba.** Đổi nhầm đường là người chơi nạp tiền không vào. Giai đoạn 2 phải ghi kép và đối soát trước khi bỏ PHP.
3. **Phiên đăng nhập hai hệ.** PHP dùng `PHPSESSID` + `$_SESSION['username']`; Go dùng cookie `haitac_sess` tra bảng `sessions`. Trong lúc giao thoa, `getSession.php` (PHP) và `/api/api.php` (Go) đọc hai nguồn khác nhau. Giai đoạn 3 phải chuyển cả hai cùng lúc, không tách.
4. **Node vào một repo chưa từng có JS build.** CI dài thêm ~2 phút, thêm `package-lock.json` phải cập nhật. Nếu thấy không đáng, giai đoạn 0 là chỗ dừng: các giai đoạn 1–5 vẫn làm được với `html/template`.
5. **Điện thoại.** Đã có tiền lệ: hai trang vỡ ở khổ 375 px vì không đo. Mỗi trang React phải đo `scrollWidth` ở 375 px và vùng chạm ≥ 44 px trước khi commit.

## 10. Ước lượng

| Giai đoạn | Công |
|---|---|
| 0 — bộ khung | 1–2 ngày |
| 1 — GM tool | 3–5 ngày |
| 2 — thanh toán | 2–3 ngày |
| 3 — cổng người chơi | 4–6 ngày |
| 4 — trang nạp client | 1 ngày |
| 5 — dọn | 1 ngày |
| **Tổng** | **12–18 ngày công** |

Thứ tự trên xếp theo giá trị trên mỗi ngày công, không theo thứ tự kỹ thuật. Giai đoạn 1 gỡ được lỗ hổng lớn nhất (công cụ phát vật phẩm viết bằng SQL nối chuỗi); giai đoạn 2 gỡ được rủi ro tiền bạc.

## 11. Cần bạn quyết

1. **React cho cả ba app, hay chỉ cho quản trị và GM?** Trang người chơi hiện là template Go, nhẹ, chạy tốt trên điện thoại, không cần build. React trả công rõ ở GM và quản trị (bảng, biểu mẫu, trạng thái sống), còn ở trang người chơi thì lợi ích mỏng hơn chi phí bundle. Mình đề nghị làm cả ba nếu bạn muốn một nền tảng thống nhất, nhưng nếu ưu tiên tốc độ trên điện thoại thì giữ trang người chơi bằng Go.
2. **Mua bán Xu giữa người chơi** (`sellcoin`): bỏ hẳn hay dựng lại trong hệ mới?
3. **Thứ tự**: làm theo 0→5 như trên, hay đẩy giai đoạn 2 (thanh toán) lên trước giai đoạn 1 vì liên quan tiền?
4. **Bỏ `hiente.php` và bản APK**: còn ai dùng không, hay xoá luôn ở giai đoạn 4?
