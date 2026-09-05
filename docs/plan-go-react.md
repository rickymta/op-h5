# Phương án: chuyển toàn bộ PHP sang Go, giao diện dùng React

Soạn 2026-09-05, cập nhật cùng ngày theo bốn quyết định của người vận hành (mục 11). Số liệu ở mục 1–2 là **đo được** từ cây hiện tại, không phải ước lượng.

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

## 6. Tám giai đoạn

Mỗi giai đoạn là một commit độc lập, **triển khai được và lùi được**. Ranh giới giai đoạn là chỗ dừng an toàn: dừng sau bất kỳ giai đoạn nào thì hệ vẫn chạy, chỉ là còn PHP. Thứ tự dưới đây theo quyết định 3 và 5: công cụ GM trước; cổng thanh toán để sau vì phức tạp và đang chạy ổn; **chợ để sau cùng** vì đó là tính năng mới, không phải phần việc chuyển PHP.

### Giai đoạn 0 — Bộ khung (không đổi hành vi người dùng)

- Dựng `web/` workspace, `packages/ui` chép nguyên bộ biến CSS và quy tắc điện thoại từ `shell.html` + `base.html`.
- `platform/internal/spa`: serve `embed.FS`, fallback `index.html`, header cache đúng.
- CI: bước Node trước Docker; cache `node_modules` theo `package-lock.json`.
- Chứng minh đường ống bằng chính app sẽ dùng ở giai đoạn 1: `apps/ops` với trang đăng nhập và một trang đã có (Đơn mua), chạy song song bản Go sau cờ `ADMIN_SPA=1`.

**Xong khi**: `docker compose up` cho ra trang quản trị React giống bản Go, tắt cờ thì về bản cũ.

**ĐÃ LÀM 2026-09-05** (build và test xanh trên PC, chưa chạy trong container):

- `web/` workspace: Vite 6 + React 19 + TypeScript, `packages/ui` (biến CSS chép từ `base.html`, `Pill`, `Toast`, `Field`, `formatInt`), `apps/ops`.
- `platform/internal/spa`: phục vụ `embed.FS`, fallback `index.html`, `assets/` immutable còn `index.html` `no-store`, chưa build thì trả trang hướng dẫn thay vì chết. Bốn test, kể cả chặn thoát thư mục bằng `../`.
- `admin`: `ADMIN_SPA=1` bật React ở gốc và đẩy trang Go về `/cu/`; thêm `GET /api/orders` (bản JSON của trang Đơn mua) và thẻ JSON cho `wallet.Order`.
- Trang Đơn mua bằng React: lọc theo game và trạng thái, tự cập nhật 5 giây khi còn đơn `pending`, phát lại và hoàn Xu.
- CI: bước Node 22 (`npm ci`, `typecheck`, `build`) **trước** ba image Go.
- Kích thước: **76 KB gzip** JS + 1,4 KB CSS, dưới ngân sách 120 KB.

Chưa xác thực lại trong React: chưa đăng nhập thì API trả 401 và trang chuyển sang form đăng nhập của Go. Dựng form trong React là việc của giai đoạn 1.

### Giai đoạn 1 — Công cụ GM

Đây là chỗ React trả công rõ nhất: `gmhanglong/gm/index.php` là **599 dòng** trộn HTML, jQuery và SQL trong một file; mỗi thao tác là một lần tải lại trang.

- Go trong `admin`: `/api/gm/*` cho nạp tay, gửi thư, truy vấn và xoá kho đồ (`bagType` 1–8, 13), CDK, tích luỹ. Dùng lại `internal/console` đã có.
- Thống nhất tài khoản: gộp `admin_users` vào `gm_users` (migration 0008, 1–2 dòng dữ liệu), một lần đăng nhập, một nhật ký `gm_audit`.
- React `apps/ops`: tra nhân vật, xem kho đồ dạng bảng, gửi thư có xem trước phần quà, CDK, và các trang gói/đơn mua vừa làm.
- nginx: `/adminportal` trỏ sang `admin` thay vì php-fpm.

**Xong khi**: làm được đủ 6 thao tác GM qua giao diện mới, nhật ký ghi đủ, `gmhanglong/` và `gm/` bị gỡ khỏi nginx.

**ĐÃ LÀM một phần 2026-09-05** (build và test xanh, chưa chạy với console thật):

- Migration 0008 gộp `gm_users` vào `admin_users`, thêm vai trò `gm`. Bốn mức: `viewer` chỉ xem, `gm` thao tác trên nhân vật, `operator` sửa cấu hình nền tảng, `owner` tất cả. Nhật ký dùng `admin_audit` sẵn có, `gm_audit` chết cùng PHP ở giai đoạn 5.
- `internal/console`: thêm GET có `Login-Token` (nhóm `/role/*` nhận tham số qua query, khác nhóm `/gm/*` nhận JSON), `FindRoles` qua statistic, `BagQuery`, `BagReduce`.
- `admin`: `/api/gm/{meta,roles,bag}` và `POST /api/gm/{bag/clear,pay,mail}`, tất cả đòi vai trò từ `gm` trở lên và ghi nhật ký kèm kết quả kể cả khi thất bại.
- Trang GM bằng React: tra nhân vật, xem và xoá từng loại kho đồ, nạp tay, gửi thư kèm quà.
- Khác PHP cũ ba chỗ, đều có chủ ý: xác thực bằng tài khoản chứ không phải mã tĩnh cộng "mật khẩu SDK"; xoá kho đồ phải khớp số ô vừa xem (`expect`) nên không xoá nhầm thứ mới rơi vào túi; console từ chối và console chết trả hai mã HTTP khác nhau.

**Còn lại của giai đoạn 1**: quản lý CDK (`gmhanglong/cdk/`, `pay/`), và quyết định ở mục 13 về dịch vụ tự phục vụ. Chưa gỡ `gmhanglong/` khỏi nginx vì hai phần đó còn ở PHP.

### Giai đoạn 2 — Trang quản trị toàn diện

Hôm nay trang quản trị chỉ làm được bốn việc: đội máy chủ, nạp tay, gói, đơn mua. Những thứ còn lại đang nằm ở script seed hoặc biến môi trường, tức muốn đổi là phải vào server. Chi tiết phạm vi ở mục 14.

Thiếu rõ nhất, xếp theo mức chặn:

| Nhóm | Bảng | Hôm nay |
|---|---|---|
| **Nhân viên** | `admin_users` | không có giao diện; tài khoản đầu tạo từ biến môi trường, không thêm được người thứ hai |
| **Game** | `games`, `oauth_clients` | chỉ `platform-seed.sh` ghi được |
| Người chơi | `users`, `wallet_accounts`, `game_identities` | không có giao diện |
| Thiết bị máy chủ | `game_devices` | sửa được, thêm thì không |
| Doanh thu | `ledger_txns`, `game_grants` | chưa có, `adminphp@2024` vẫn giữ vai này |
| Tham số hệ thống | bảng `platform_settings` (chưa có) | nằm trong `.env`, đổi phải khởi động lại |

**Xong khi**: thêm được một game mới và một nhân viên mới mà không đụng vào server, và `adminphp@2024` bị gỡ khỏi nginx.

**ĐÃ LÀM hai phần đầu 2026-09-05** (build và test xanh, chưa chạy với database thật):

- **Game**: `GET /api/games`, `POST /api/games`, `POST /api/games/{code}`. Thêm game ghi cả bốn bảng trong **một giao dịch** — ghi rời rạc để lại một game nửa vời có dòng trong `games` mà không có client OIDC, và người chơi bấm Đăng nhập sẽ nhận một lỗi không giải thích được. Sửa `site_url` thì `redirect_uris` đổi theo, vì OIDC so khớp tuyệt đối. Trang nói rõ nó chỉ ghi database: tiến trình Adapter của game mới vẫn phải khởi động riêng, kèm đúng ba biến môi trường cần đặt.
- **Nhân viên**: `GET/POST /api/staff`, `POST /api/staff/{id}`, `POST /api/staff/{id}/password`. Chỉ `owner` vào được. Mật khẩu do hệ thống sinh và hiện **một lần**. Ba chỗ tự chặn đã cài: không tự hạ quyền hay tự khoá mình, không bỏ người `owner` hoạt động cuối cùng, và khoá tài khoản hay đổi mật khẩu thì cắt luôn phiên đang mở.
- Chín test mới cho khuôn mã game, tên đăng nhập, URL, vai trò và độ ngẫu nhiên của mật khẩu.

**Còn lại của giai đoạn 2**: người chơi, doanh thu (thay `adminphp@2024`), thiết bị máy chủ, `platform_settings`.

### Giai đoạn 3 — Cổng người chơi

- `apps/portal` (id.domain): đăng ký, đăng nhập, ví, lịch sử giao dịch, đổi mật khẩu, quên mật khẩu.
- `apps/game` (haitac.domain): trang chủ, máy chủ, cửa hàng, cổng vào game.
- `/api/getSession.php` chuyển sang `adapter` — **giữ nguyên đường và khuôn trả về** (`true` / `taoaccmoi` / `lamgiday`), nhưng đối chiếu với `platform.users` thay vì `web.user`.
- Các rewrite cũ `/user-*`, `/act-*`, `/tai-khoan`, `/nap-tien`… trả 301 sang route mới.

Nạp tiền vẫn để nguyên PHP ở giai đoạn này: trang nạp trỏ sang `api/card.php` cũ cho tới giai đoạn 5.

**Xong khi**: `user/` và `api/config.php` không còn được nginx trỏ tới; người chơi vào link cũ vẫn tới đúng chỗ.

### Giai đoạn 4 — Trang nạp client

`play.php` hiện gọi `curl` sang adapter rồi nhúng `window.__opAuto`. Chuyển vào adapter là bỏ được một chặng mạng và một chỗ đặt cookie.

- Adapter phục vụ `/play.php` (giữ nguyên đường vì `a3b31` trỏ tới), sinh HTML kèm `__opAuto`, `opBundleV` theo `filemtime`.
- Bỏ `hiente.php`, `index.php`, `ios.html` theo quyết định 4.

### Giai đoạn 5 — Cổng thanh toán

Để sau cùng vì đây là chỗ duy nhất đang chạy ổn mà hỏng thì mất tiền thật của người chơi.

- Go trong `id`: bảng `topup_orders` thay `web.card_log`; đơn thẻ cào gọi thesieutoc.net; ba webhook kiểm chữ ký như hiện tại (`hash_equals`, không phụ thuộc thời gian).
- nginx giữ nguyên ba đường `.php` của webhook, trỏ sang `id`. Ghi rõ trong runbook: **không được đổi ba đường này**.
- Ghi kép trong một tuần: Go ghi `topup_orders`, đồng thời ghi `web.card_log` để đối soát; sau đó bỏ.

**Xong khi**: nạp thẻ và nhận callback bank/momo chạy hết bằng Go, đối chiếu số dư khớp giữa hai bảng trong 7 ngày.

### Giai đoạn 6 — Dọn

- Gỡ container `php`, `docker/php/`, `web-entrypoint.sh` phần điền secret PHP.
- Xoá `website/game/{api,user,gm,gmhanglong,adminphp@2024,new,adminhl@2024}`; `website/game` chỉ còn tài nguyên tĩnh của client.
- `mask-secrets.py`: bỏ 27 quy tắc PHP, giữ lại phần server Java.
- nginx `game_site.conf` rút còn: tĩnh + proxy + ba đường tương thích.

**Kết quả**: 7.906 dòng PHP → 0. Một container ít hơn, 192 MB RAM tiết kiệm, và mọi truy vấn SQL đi qua tham số thay vì nối chuỗi.

### Giai đoạn 7 — Chợ Xu ⇄ Nguyên Bảo (sau cùng)

Làm sau khi PHP đã bỏ hết: đây là tính năng mới, không phải phần việc chuyển đổi, nên không chặn giai đoạn nào khác. Thiết kế đầy đủ ở mục 12. Việc: migration 0009, `internal/market`, lệnh ký gửi qua console, trang chợ trong `apps/game`, trang giám sát trong `apps/ops`.

**Trước hết phải thử `numType=1`** trên máy dev: đăng một tin nhỏ, xem Nguyên Bảo có thật sự rời nhân vật không. Sai giá trị này là trừ nhầm loại tiền.

**Xong khi**: bán → mua → nhận Nguyên Bảo trong game chạy hết một vòng, phí vào `market_fee`, huỷ tin trả lại đúng số lượng.

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
| `sellcoin`, `sellcoin_log` | không port dữ liệu (chưa từng chạy được), nhưng **dựng lại chức năng** thành chợ: `market_listings` + `market_events` — mục 12 |
| `cms` | bỏ (bài viết, 1 file dùng) |
| `setting`, `transaction`, `bot_tele_gram` | **bỏ** — 0 file PHP nào tham chiếu |

## 8. Không port, xoá thẳng

- `gm/` — công cụ GM cũ, mọi chức năng đã có trong `gmhanglong`.
- `adminhl@2024/admtool` (15 MB) — bản build React của GMC-2 do nhà phát hành làm, giao diện tiếng Trung, **không có mã nguồn**. Không sửa được, không dịch được.
- `api/api2.php`, `api/apiapk.php`, `user/indexapk.php`, `user/naptien2.php`, `hiente.php`, `ios.html` — bản sao cho APK và cho domain cũ. **Bỏ cả hai** (quyết định 4); bản điện thoại sẽ làm lại sau, không dựa trên mấy file này.
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
| 0 — bộ khung React | 1–2 ngày |
| 1 — công cụ GM | 3–5 ngày |
| 2 — trang quản trị toàn diện | 4–6 ngày |
| 3 — cổng người chơi | 4–6 ngày |
| 4 — trang nạp client | 1 ngày |
| 5 — cổng thanh toán | 2–3 ngày |
| 6 — dọn | 1 ngày |
| 7 — chợ (sau cùng) | 3–4 ngày |
| **Tổng** | **19–28 ngày công** |

Giai đoạn 1 gỡ được lỗ hổng lớn nhất: công cụ phát vật phẩm viết bằng SQL nối chuỗi. Giai đoạn 5 gỡ được rủi ro tiền bạc nhưng để sau cùng theo quyết định 3.

## 11. Quyết định (2026-09-05)

1. **React cho cả ba app**, kể cả trang người chơi.
2. **Dựng lại mua bán Xu** thành một **chợ riêng có thu phí** — thiết kế ở mục 12. Cập nhật 2026-09-05: **để sau cùng**, làm sau khi chuyển xong toàn bộ PHP.
3. **Hoãn cổng thanh toán**, làm công cụ GM trước. Thứ tự giai đoạn ở mục 6 đã xếp lại theo đó.
4. **Bỏ `hiente.php` và bản APK.** Bản điện thoại làm lại sau, không kế thừa.

## 12. Chợ Xu ⇄ Nguyên Bảo (giai đoạn 7)

Bảng `web.sellcoin` cũ cho người chơi bán Nguyên Bảo lấy Xu, nhưng **chưa bao giờ chạy**: nó gọi `gmhanglong/gm/coin.php`, file đó không tồn tại trong bản triển khai (lỗi số 6 trong CLAUDE.md). Nên đây là làm mới, không phải khôi phục.

### 12.1 Ký gửi được, đã kiểm chứng

Console có sẵn hai lệnh cần thiết (đọc từ bytecode `RoleWalletController`):

```
POST /role/wallet/query   {srvCode, roleId}                      -> số dư nhân vật
POST /role/wallet/reduce  {srvCode, roleId, numType, num, note}  -> trừ tiền của nhân vật
```

`numType` là một byte. Suy từ `gm/item.txt` (`0:1` = Nguyên Bảo) thì `numType=1`, **chưa chạy thật lần nào** — phải thử trên máy dev trước khi mở chợ.

Chiều ngược lại (giao Nguyên Bảo cho người mua) dùng đúng đường thư đã có: `game_grants` với `grant_mode='mail'`, phần quà `0:1:<số lượng>`.

### 12.2 Luồng

**Đăng bán** — ký gửi trước, niêm yết sau. Không có bước ký gửi thì người bán tiêu hết Nguyên Bảo rồi vẫn còn tin rao.

1. Người bán chọn nhân vật, số Nguyên Bảo, giá (Xu cho mỗi 1.000 Nguyên Bảo).
2. Ghi `market_listings` trạng thái `escrowing` **trước khi** gọi console.
3. Gọi `/role/wallet/reduce`. Thành công → `active`. Console từ chối → `void`, người bán không mất gì.

**Mua** — một giao dịch DB duy nhất, khoá dòng tin trước:

1. Khoá tin (`SELECT … FOR UPDATE`), kiểm còn `active`.
2. Trừ Xu người mua; cộng cho người bán phần đã trừ phí; phí vào tài khoản hệ thống `market_fee`. Cả ba dòng trong một `ledger_txns` loại `market`, tổng bằng 0 như mọi giao dịch khác.
3. Tin → `sold`, tạo `game_grants` giao Nguyên Bảo cho nhân vật người mua.
4. Worker phát hàng như cửa hàng, kể cả hoàn Xu nếu game từ chối.

**Huỷ tin**: tạo lệnh trả Nguyên Bảo về nhân vật người bán qua thư, tin → `cancelled`.

### 12.3 Phí và giới hạn giá

| Tham số | Mặc định | Vì sao |
|---|---|---|
| `MARKET_FEE_PCT` | 5% | trừ vào phần **người bán** nhận, hiện rõ trước khi đăng |
| `MARKET_PRICE_MAX_PCT` | 100% giá cửa hàng | bán đắt hơn cửa hàng thì không ai mua, chỉ làm rác bảng |
| `MARKET_PRICE_MIN_PCT` | 50% giá cửa hàng | chặn bán tháo và chặn chuyển Xu trá hình qua giá gần 0 |
| `MARKET_MAX_OPEN_LISTINGS` | 5 tin/người | chặn spam bảng |
| `MARKET_MAX_DAILY_VOLUME` | cấu hình | trần khối lượng mỗi người mỗi ngày |

Cửa hàng bán 1 Xu = 1 Nguyên Bảo và lần đầu mỗi mốc được x2. Chợ luôn rẻ hơn cửa hàng theo thiết kế, nên **phí là thứ duy nhất giữ cho cửa hàng không bị chợ ăn hết**. Nếu doanh thu cửa hàng tụt sau khi mở chợ thì nâng phí hoặc nâng giá sàn, không phải đóng chợ.

### 12.4 Dữ liệu (migration 0009)

```
market_listings   id, game_code, srv_code, seller_user_id, seller_role_id, seller_role_name,
                  num_type, amount, price_xu, fee_xu, status, escrow_error,
                  buyer_user_id, buyer_role_id, txn_id, created_at, sold_at
market_events     nhật ký: listing_id, actor_user_id, action, detail, ip, created_at
wallet_accounts   thêm một dòng hệ thống: code = 'market_fee'
```

### 12.5 Chỗ hỏng không tự chữa được

Nếu `/role/wallet/reduce` thành công mà ghi DB hỏng ngay sau đó, Nguyên Bảo đã rời nhân vật nhưng không có tin rao. Ghi dòng `escrowing` trước khi gọi console giúp phát hiện: mọi dòng `escrowing` quá hai phút được đánh dấu và hiện ở trang quản trị để xử lý tay. Không tự hoàn được, vì console không có lệnh "cộng lại" nào an toàn để gọi mù.

## 13. Cần bạn quyết: công cụ GM là của ai

Đọc `gmhanglong/gm/api.php` mới thấy mô hình cũ không phải công cụ nội bộ. Người chơi mua một **CDK**, kích hoạt nó lên nhân vật của mình kèm một "mật khẩu SDK" tự đặt (`gmhanglong/pay/pay.php`), rồi **tự** dùng các chức năng: nạp, gửi thư, dọn kho đồ. Cột `cdk.type` quyết định người đó được dùng tới chức năng số mấy.

Hiện tại đường này đã bị chặn: nginx chỉ cho loopback vào `/adminportal`, nên thực tế chỉ nhân viên dùng được. Bản Go mình vừa viết theo đúng thực tế đó, tức **chỉ nhân viên**.

Ba hướng, cần bạn chọn:

1. **Chỉ nhân viên** (đang làm). Bỏ luôn CDK và `cdks.cdk`. Đơn giản nhất, nhưng nếu trước đây có bán CDK thì mất một nguồn thu.
2. **Giữ dịch vụ tự phục vụ**, dựng lại bằng tài khoản hệ thống ID thay cho "mật khẩu SDK": người chơi đăng nhập, nhập CDK, được mở một số thao tác trên chính nhân vật của mình. An toàn hơn bản cũ, nhưng là một tính năng riêng cần thiết kế.
3. **Giữ nguyên phần CDK ở PHP** thêm một thời gian, chuyển nốt ở giai đoạn 5.

Chưa có câu trả lời thì mình làm tiếp giai đoạn 2 và để `gmhanglong/` chạy song song.

## 14. Phạm vi trang quản trị toàn diện (giai đoạn 2)

Một chỗ duy nhất để vận hành cả nền tảng, không phải SSH vào server để đổi một dòng.

### 14.1 Game

Thêm một game vào hệ thống nghĩa là ghi bốn thứ, hiện chỉ `platform-seed.sh` làm được:

| Bảng | Nội dung |
|---|---|
| `games` | mã, tên, `adapter_url` (nơi Adapter của game đó nghe), `site_url`, thứ tự, ẩn/hiện |
| `oauth_clients` | client OIDC của game, `redirect_uris` phải khớp `site_url` + `/auth/callback` |
| `game_devices` | máy vật lý và trần người online của nó |
| `game_servers` | từng máy chủ: `srv_code`, cổng WebSocket, ngưỡng mềm, biên tràn |

Giao diện ghi đủ bốn bảng trong một biểu mẫu. **Nó không khởi động được tiến trình**: mỗi game cần một container Adapter riêng với `ADAPTER_GAME_CODE`, và cụm Java của game đó phải chạy. Trang nói rõ điều này sau khi tạo, kèm đúng dòng lệnh cần chạy.

### 14.2 Nhân viên

`admin_users` hiện không có giao diện nào. Tài khoản đầu tiên sinh từ `ADMIN_BOOTSTRAP_*` và **chỉ khi bảng còn trống**, nên muốn thêm người thứ hai là phải vào database. Cần: danh sách, thêm, đổi vai trò, khoá, đặt lại mật khẩu. Chỉ `owner` được vào.

Ba chỗ tự chặn, vì mất quyền vào trang quản trị là sự cố không tự sửa được:
- không tự hạ quyền hoặc tự khoá chính mình;
- không khoá hoặc hạ quyền người `owner` cuối cùng;
- mật khẩu đặt lại hiện **một lần**, không lưu lại chỗ nào đọc lại được.

### 14.3 Người chơi

Tìm theo tên hoặc email, xem số dư ví và lịch sử, xem nhân vật trong từng game (`game_identities`), khoá hoặc mở tài khoản. Không xem được mật khẩu và không có nút đăng nhập hộ.

### 14.4 Doanh thu

Thay `adminphp@2024` (541 dòng, và đăng nhập admin của nó luôn thành công vì kiểm `rowCount() < 0`). Nguồn số liệu là `ledger_txns` và `game_grants`, không phải bảng `web` cũ: nạp theo ngày, quy đổi theo gói, gói bán chạy, số Xu chưa tiêu.

### 14.5 Tham số hệ thống

Bảng `platform_settings` dạng khoá và giá trị cho những thứ hôm nay nằm trong `.env` mà đổi phải khởi động lại: phí chợ, ngưỡng chặn tải mặc định, thông báo trên trang, bật tắt đăng ký. Những gì là bí mật thì **ở lại `.env`**, không đưa vào database.

