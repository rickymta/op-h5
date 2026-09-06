# platform/ — hệ thống ID và lớp phiên dịch cho các game

Mã nguồn mới của nền tảng nhiều game, viết bằng Go. Khác với phần còn lại của repo
(vốn là **snapshot triển khai** của một game, không có mã nguồn), thư mục này là mã
nguồn thật và có test.

> **Repo này là public.** Không có giá trị bí mật nào được phép nằm trong file ở đây.
> Khoá ký, mật khẩu DB, client secret đều đọc từ biến môi trường, và thiếu biến bắt
> buộc thì chương trình **dừng ngay lúc khởi động** thay vì chạy tiếp với mặc định.

## Trạng thái

| Thành phần | Cổng | Trạng thái |
|---|---|---|
| `cmd/id` — OIDC provider, danh tính, ví, trang chính của cổng + tài khoản | 8080 | ✅ kiểm chứng end-to-end |
| `cmd/adapter` — trang game, token ID → tài khoản game, cổng giới hạn tải, phát vật phẩm | 8090 | ✅ kiểm chứng end-to-end |
| `cmd/admin` — theo dõi đội server, điều khiển ngưỡng, game, nhân viên, tin tức | 8100 | ✅ kiểm chứng end-to-end |
| `cmd/fakelogin` — login server giả, chỉ để phát triển | 9000 | ✅ |
| Nhiều game trên cùng nền tảng | | ✅ kiểm chứng bằng game thứ hai |

### Giao diện: 5 app React, 3 tiến trình

Người vận hành tách giao diện thành 5 app riêng nhưng **giữ nguyên ba tiến trình Go**; hai tiến
trình vì thế mang hai bundle, phục vụ dưới hai tiền tố khác nhau (`internal/spa`):

| Tiến trình | Đường | Thư mục nhúng | Nguồn (`web/`) | Vite `base` |
|---|---|---|---|---|
| `admin` :8100 | `/` | `cmd/admin/dist` | `admin/apps/platform` (MUI) | `/` |
| `admin` :8100 | `/gm` | `cmd/admin/dist-gm` | `admin/apps/gm` (MUI) | `/gm/` |
| `id` :8080 | `/` | `cmd/id/dist` | `site/apps/portal` (Tailwind) | `/` |
| `id` :8080 | `/cho` | `cmd/id/dist-market` | `site/apps/market` (Tailwind) | `/cho/` |
| `adapter` :8090 | `/` | `cmd/adapter/dist` | `site/apps/haitac` (Tailwind) | `/` |

**Không còn cờ `ADMIN_SPA` / `ID_SPA` / `ADAPTER_SPA` và tiền tố `/cu/`.** Bundle luôn được phục
vụ; chưa chạy `npm run build` trong `web/` thì đường giao diện trả một trang 503 nói rõ cách sửa,
còn API vẫn chạy bình thường (thư mục `dist*` tồn tại sẵn nhờ `.gitkeep` nên `go build` không hỏng).
Bundle con là một pattern riêng của `ServeMux` (`GET /gm/`, `GET /cho/`) nên nó không nuốt đường của
bundle ở gốc và ngược lại; `base` của Vite **phải** khớp tiền tố, sai là trình duyệt xin tài sản ở
`/assets/…` rồi nhận `index.html`.

### Trang chính của cổng (`domain.com`, dịch vụ `id`)

`id` phục vụ trang chính và trang tài khoản. API công khai (không cần đăng nhập): `GET /api/site`
(thương hiệu từ `ID_BRAND_NAME`/`ID_SUPPORT_URL`/`ID_FANPAGE_URL`/`ID_TOPUP_URL`/`ID_LEGAL_NOTE`
+ thông báo ghim), `GET /api/games` (game `active`, game `featured` lên đầu; `online`/`servers_open`
hỏi `GET <adapter_url>/api/game/servers` với timeout 3 s, **cache 30 s mỗi Adapter**, chống dồn;
Adapter chết thì `live:false`; URL ảnh tương đối được ghép với `site_url`), `GET /api/news`,
`GET /api/news/{key}` (`key` là **slug hoặc id**: toàn chữ số thì tra id trước rồi tới slug, nên
liên kết cũ `/tin-tuc/12` vẫn mở được; vào bằng id mà bài có slug thì trả thêm `canonical_slug`
để trang tự đổi đường dẫn — không chuyển hướng phía máy chủ vì trang là SPA). API có phiên: `POST /api/login`, `/api/logout`, `GET /api/me` (mở rộng),
`POST /api/me/email`, `GET /api/me/games`, `GET /api/me/orders?limit=` (đơn mua ở **mọi** game),
`GET /api/me/sessions` + `POST …/revoke-others`, `GET /api/wallet/history?kind=&page=&page_size=`,
`GET /api/wallet/summary` (số dư + tổng đã nạp / đã đổi / đã hoàn + số đơn theo trạng thái, đọc
thẳng từ sổ cái và `game_grants` nên không bao giờ lệch với số dư).

Nội dung tĩnh sửa được ở trang quản trị: `GET /api/pages/{slug}` → `{slug,title,body,updated_at}`
(bảng `pages`, migration 0011; `body` là **văn bản thuần** — đoạn cách nhau bằng dòng trống, `## `
tiêu đề phụ, `- ` gạch đầu dòng — không phải HTML, để tầng hiển thị không phải lọc XSS).

**Hai giao diện trong một tiến trình.** `id` phục vụ hai bundle React nhúng bằng `go:embed`:

| Đường | Thư mục nhúng | Nguồn |
|---|---|---|
| `/` | `cmd/id/dist` | `web/site/apps/portal` — cổng chính + tài khoản |
| `/cho` | `cmd/id/dist-market` | `web/site/apps/market` — chợ (mới, chưa nối backend) |

`/cho/` là một pattern riêng của `ServeMux` nên nó **không** rơi vào bundle ở gốc và ngược lại;
`base` của Vite ở app chợ phải là `/cho/` để đường tài sản khớp. `/api/*`, `/oauth/*`,
`/.well-known/*`, `/internal/*`, `/healthz` cụ thể hơn `GET /` nên không bị nuốt, và
`GET|POST /api/` trả 404 **JSON** thay vì `index.html`. Không còn cờ bật/tắt: bundle luôn được
phục vụ, chưa `npm run build` thì đường giao diện trả một trang 503 nói rõ cách sửa (API vẫn chạy).

Template Go duy nhất còn lại là **trang đăng nhập OIDC** `login.html` — form POST tới
`/oauth/authorize/login`, nằm giữa hai domain trong luồng uỷ quyền nên không thể là một màn hình
của SPA. Các trang Go cũ (trang chính, đăng ký, tài khoản, quên/đặt lại mật khẩu) đã bị xoá: chúng
vốn chỉ là form gọi API JSON. CSP của `id` (`internal/httpx.SecurityHeaders`) có `'self'` cho
script/style, `img-src 'self' data: https:` (ảnh game nằm ở host của game), `font-src 'self'`.

### Trang của game (`haitac.domain.com`)

Adapter phục vụ `/`, `/may-chu`, `/cua-hang`, `/tin-tuc`, `/tin-tuc/{id}`, `/choi-game`; nginx
proxy các đường đó (cùng `/auth/`, `/api/game/`, `/app/`) sang `:8090` và giữ nguyên phần
còn lại cho tầng PHP cũ (xem `docker/nginx/game_site.conf`). Dùng `=` và `^~` để chúng thắng trước
regex `\.php$` và `\.(js|css)$`, nên `/api/getSession.php` vẫn về PHP.

Số liệu trên trang là **sống**: dải trạng thái máy chủ đến từ chính bộ đếm tải mà cổng
giới hạn đang dùng. Phục vụ bằng file tĩnh thì trang sẽ hiện một con số còn cổng lại
quyết định theo một con số khác.

Nhận diện **không còn gắn cứng**: tên, tagline, thể loại, ảnh bìa / key visual / logo, màu nhấn,
nhãn Mới/Hot/Sắp ra và ba liên kết đọc từ dòng `games` của chính game (migration 0010, sửa ở trang
quản trị → Game) qua `GET /api/game/meta` — kèm `recommended` (máy chủ gợi ý cho người mới, cùng
`AdmitNew` mà cổng dùng), `servers_open`, `online`, `brand`, `id_base`. Tiêu đề thư cửa hàng
mặc định `"Cửa hàng " + tên game`. Ảnh thương hiệu đặt ở `ASSETS_DIR/brand/<game>/…`, nginx phục vụ
`/brand/`; URL trong bảng có thể tương đối so với `site_url`. Tin của game + tin chung:
`GET /api/game/news?limit=`, `GET /api/game/news/{key}` (slug hoặc id, như bên `id`); trạng thái
đăng nhập: `GET /api/game/me`.

**Cửa hàng.** `GET /api/game/packages` giữ khuôn cũ (`{categories:[…]}`) và nhận thêm
`?q=&cat=&sort=price_asc|price_desc|popular&page=&page_size=`; có bất kỳ tham số nào trong nhóm đó
thì trả **thêm** khối `{list:{packages,page,page_size,total,pages}}` — một lượt gọi, một lượt đọc DB.
Tìm kiếm **bỏ dấu tiếng Việt ở Go** (`internal/textnorm`), không dựa vào collation: bảng dùng
`utf8mb4_unicode_ci`, collation đó coi `ê` khác `e` nên `LIKE '%nguyen%'` không bao giờ khớp
"Nguyên Bảo". `GET /api/game/packages/{id}` trả thêm `reward_items` (dựng từ chuỗi quà
`type:id:count#…`; `0:1`=Nguyên Bảo, `0:0`=Kim tệ, `0:4`=EXP anh hùng), `grant_note`, `server_days`,
`daily_limit`, `vip_required`. `GET /api/game/store/stats` trả số gói và số nhóm **thật**.
Nhóm `ingame` (các mục nạp chỉ để tra giá khi mua trong game) bị lọc ở **mọi** cửa vào — danh sách,
tìm kiếm và cả trang chi tiết (404 `package_unknown`).

Trang tĩnh của game: `GET /api/game/pages/{slug}` — tra `(slug, game_code)` trước, không có thì lùi
về bản chung, nên một game chỉ phải viết lại những trang nó muốn khác.

Bundle React `web/site/apps/haitac` (nhúng từ `cmd/adapter/dist`, assetsDir `app/` vì `/assets/`
trên host game đã thuộc client LayaAir) phục vụ **mọi** đường GET không khớp một pattern cụ thể hơn:
`/`, `/may-chu`, `/cua-hang`, `/cua-hang/{id}`, `/tin-tuc`, `/tin-tuc/{id}`, `/gioi-thieu`,
`/huong-dan`, `/faq` và tài sản `/app/*`. `/choi-game`, `/auth/*`, `/api/*`, `/srv/*`, `/quy-doi`,
`/admin-portal*`, `/healthz` cụ thể hơn nên không bị nuốt; `GET|POST /api/` trả 404 JSON.
**Một bundle chạy cho mọi game** — game mới chỉ cần dòng `games` + ảnh trong `brand/`, không build
lại image. Thêm một đường mới cho trang thì **vẫn** phải thêm một `location` trong
`docker/nginx/game_site.conf`: `location /` của host game đi về `play.php` của tầng PHP cũ, không
về Adapter.

Template Go còn lại ở Adapter: `full.html` (màn hình "máy chủ đang đầy", hiện **trong** luồng
`/choi-game` trước khi trình duyệt kịp tải bundle nào) cùng `shell.html` mà nó dùng, và `gm.html` /
`gmlogin.html` của cổng GM riêng của game ở `/admin-portal`.

**Chưa làm:** tích hợp login server và console THẬT (cần dump DB từ server cũ).

### Trang quản trị (`cmd/admin`, :8100)

**Hai giao diện trong một tiến trình.** `admin` phục vụ hai bundle React nhúng bằng `go:embed`:

| Đường | Thư mục nhúng | Nguồn |
|---|---|---|
| `/` | `cmd/admin/dist` | `web/admin/apps/platform` — quản trị nền tảng |
| `/gm` | `cmd/admin/dist-gm` | `web/admin/apps/gm` — công cụ GM của game |

Không tách tiến trình vì cả hai dùng chung bảng `admin_users`, chung phiên đăng nhập và chung
`admin_audit`; tách ra chỉ để tách bundle, không tách quyền. `base` của Vite ở app GM phải là
`/gm/`. **API GM vẫn nằm ở Adapter của từng game** (`haitac.<domain>/admin-portal/api/*`, xem
`cmd/adapter/adminportal.go` + `internal/gmops`): mọi thao tác GM đi qua console của cụm game, thứ
riêng của từng game. `admin` chỉ phục vụ *bundle* giao diện GM.

Đăng nhập là JSON: `POST /api/login` (nhận cả JSON lẫn form; bí danh `POST /dang-nhap`) và
`POST /api/logout` (bí danh `POST /dang-xuat`) — màn hình đăng nhập là một route của SPA, không còn
template Go. Mọi endpoint bảo vệ trả **401 JSON** thay vì 302 sang trang đăng nhập: một chuyển
hướng ở đây làm `fetch()` nhận về HTML kèm mã 200, lỗi khó lần ra nhất trong một SPA.

Đường JSON: `GET /api/fleet`, `GET /api/audit` (200 dòng gần nhất), `GET /api/orders`,
`GET /api/packages?game=&category=&status=&q=` (kèm `games`, `cats`), `GET /api/pages`,
`POST /api/pages` (upsert theo `slug` + `game_code`), `POST /api/pages/{id}/delete` — vai trò
`operator` trở lên, ghi `admin_audit`, thân request tối đa 256 KB. Toàn bộ trang Go cũ và tiền tố
`/cu/` đã bị xoá; thư mục `cmd/admin/templates` không còn.

**Mở ra Internet (`ADMIN_PUBLIC=1`).** Dịch vụ **vẫn bind `127.0.0.1:8100`** — nginx là thứ duy nhất
nối ra ngoài; cờ này chỉ siết ba lớp ở tầng ứng dụng (`cmd/admin/login.go`):

1. Đăng nhập đếm số lần sai theo **tên đăng nhập** và theo **IP** (`httpx.ClientIP`, tôn trọng
   `X-Forwarded-For` do nginx đặt), mặc định khoá tạm sau **8 lần / 15 phút** → HTTP 429 kèm thông
   báo tiếng Việt. Bảng riêng `admin_login_attempts` chứ không dùng chung `login_attempts` của
   người chơi: dùng chung thì một người chơi gõ sai mật khẩu sẽ khoá nhầm tài khoản quản trị trùng
   tên. Mọi lượt đăng nhập, thành công hay thất bại, đều vào log kèm IP.
2. Cookie phiên bắt buộc `Secure` và `MaxAge` rút từ 12 giờ xuống **4 giờ**.
3. **Dừng hẳn lúc khởi động** nếu còn tài khoản `owner` mang cờ `must_change_password` — tức là còn
   dùng mật khẩu mặc định ghi trong `main.go` của một repo **công khai**. Thông báo lỗi nói rõ cách
   sửa. Đổi mật khẩu ở trang Tài khoản là cờ tắt và khởi động lại được.

## Vì sao logic giới hạn tải nằm ở đây, không nằm trong game

`tcg.srv_game` có sẵn trường `playerMax`, nhưng quét toàn bộ class của login server cho
thấy **không lớp nào đọc nó** — `getConnectTarget()` trả về địa chỉ tiến trình game mà
không kiểm tra tải. Vì các JAR không có mã nguồn, chỗ chặn khả thi duy nhất là lớp
Adapter đặt trước `/srv/game/connect/target`.

Ba tầng ngưỡng, kiểm tra từ trong ra ngoài:

1. **Server** — ngưỡng mềm `N` riêng cho từng dòng `srv_game`.
2. **Máy vật lý** — tổng của mọi server cùng `device_code`.
3. **Toàn game** — chỉ để cảnh báo dung lượng, không dùng để chặn.

`onlineNum` đến từ heartbeat nên luôn trễ một nhịp; Adapter cộng thêm số vé đã cấp kể
từ nhịp gần nhất, nếu không một đợt vào ồ ạt sẽ lọt qua cổng.

## Chạy thử

```bash
# 1. MySQL (dùng chung instance với game cũng được, khác database)
docker run -d --name pf-mysql --network host -e MYSQL_ROOT_PASSWORD=... mysql:8.0

# 2. Khoá ký RSA — KHÔNG commit file này
openssl genrsa -out id-signing.pem 2048

# 3. Chạy
docker build -f platform/Dockerfile --build-arg CMD=id -t op-h5-id platform/
docker run -d --name pf-id --network host \
  -e ID_ISSUER="https://id.example.com" \
  -e ID_DB_PASSWORD="..." \
  -e ID_SIGNING_KEY_PEM="$(cat id-signing.pem)" \
  op-h5-id
```

Migration tự chạy lúc khởi động (`internal/store/migrations/*.sql`, chạy một lần mỗi file). **Database `platform` thì không tự tạo** — trong Docker, service `platform-seed` (`docker/platform-seed.sh`) tạo DB rồi seed `oauth_clients`, `games`, `game_devices`, `game_servers`, `game_packages` từ `.env` + `tcg.srv_game` + `docker/platform-seed/game_packages.<game>.sql`; chạy tay thì `CREATE DATABASE platform` trước.

### Đăng ký một game làm OIDC client

```sql
INSERT INTO oauth_clients (client_id, name, secret_hash, redirect_uris, scopes, require_pkce)
VALUES ('haitac', 'Đại Hải Trình', NULL, 'https://haitac.example.com/auth/callback',
        'openid profile wallet', 1);
```

`secret_hash = NULL` là client công khai — chỉ dựa vào PKCE. Client bí mật thì đặt
chuỗi băm Argon2id.

## Thêm một game mới

Toàn bộ là **cấu hình, không sửa code**. Đã kiểm chứng bằng cách cắm game thứ hai
(`tamquoc`) vào hệ thống đang chạy:

```sql
-- 1. Đăng ký làm OIDC client
INSERT INTO oauth_clients (client_id, name, secret_hash, redirect_uris, scopes, require_pkce)
VALUES ('tamquoc', 'Tam Quốc', NULL, 'https://tamquoc.example.com/auth/callback',
        'openid profile wallet', 1);

-- 2. Khai báo cho trang quản trị biết hỏi Adapter nào
INSERT INTO games (code, name, adapter_url, site_url, sort_order)
VALUES ('tamquoc', 'Tam Quốc', 'http://127.0.0.1:8190', 'https://tamquoc.example.com', 2);

-- 3. Đội server và ngưỡng riêng của game đó
INSERT INTO game_devices (game_code, device_code, name, max_online)
VALUES ('tamquoc', 'host-02', 'Máy 02', 2000);
INSERT INTO game_servers (game_code, srv_code, name, device_code, ws_port,
                          soft_limit, overflow_pct, recommend, status)
VALUES ('tamquoc','t1','Kinh Châu','host-02',8101,500,15,1,'running'),
       ('tamquoc','t2','Từ Châu','host-02',8102,800,10,1,'running');
```

Rồi chạy thêm **một container Adapter nữa, cùng image**, chỉ khác biến môi trường:

```bash
docker run -d --network host \
  -e ADAPTER_ADDR=":8190" -e ADAPTER_GAME_CODE=tamquoc -e ADAPTER_GAME_ID=20001 \
  -e ADAPTER_CLIENT_ID=tamquoc \
  -e ADAPTER_REDIRECT_URI="https://tamquoc.example.com/auth/callback" \
  -e ADAPTER_LOGIN_BASE_URL="http://127.0.0.1:9100" \
  -e TCG_SECRET="<secret cua game do>" \
  -e ADAPTER_SECRET_ENC_KEY="<khoa rieng cua game do>" \
  -e ADAPTER_PUBLIC_HOST="tamquoc.example.com" \
  op-h5-adapter
```

Tên/tagline/ảnh của game đó điền ở trang quản trị (Game) sau khi có dòng `games`; ảnh chép vào
`ASSETS_DIR/brand/tamquoc/` rồi ghi URL `/brand/tamquoc/…`. Adapter còn nhận `ADAPTER_GAME_NAME`
(tên dự phòng khi chưa có dòng `games`) và `ID_BRAND_NAME` (thương hiệu ở chân trang).

**Mỗi game một `ADAPTER_SECRET_ENC_KEY` riêng.** Dùng chung một khoá nghĩa là lộ khoá
của game này thì mở được tài khoản game kia.

Một người dùng ID có tài khoản **riêng** ở từng game — cùng `user_id` nhưng khoá khác
nhau, nên nhân vật và tiến độ hoàn toàn tách biệt:

```
user_id  game_code  game_username  khoa_rieng
1        haitac     id000000001    2E46B364…
1        tamquoc    id000000001    7E2E7663…
```

## Nối cổng nạp tiền hiện có vào ví

Tích hợp thẻ cào / bank / MoMo **vẫn ở tầng PHP**, không viết lại. Chúng đang chạy với
API key và chữ ký thật của nhà cung cấp; viết lại bằng Go nghĩa là chuyển cả phần rủi
ro nhất sang mã chưa chạy ngày nào.

Thay vào đó, khi nhà cung cấp **đã xác nhận** thanh toán, callback PHP gọi một API nội
bộ để tiền vào sổ cái ID thay vì cột `web.user.xu`:

```php
require_once __DIR__ . '/id_wallet.php';
// $taskId là mã giao dịch của nhà cung cấp — dùng làm khoá chống trùng
$r = id_wallet_topup($username, $soXu, 'the-' . $taskId, 'Nạp thẻ ' . $mang, $taskId);
if (!$r['ok']) { error_log('nạp ví ID thất bại: ' . $r['error']); }
```

Xác thực bằng HMAC trên thân request (`hex(HMAC_SHA256(secret, "<timestamp>." . body))`,
đặt ở `X-Timestamp` + `X-Signature`), không phải token người dùng — bên gọi là tiến
trình server, không có ai đăng nhập.

Hai biến môi trường cho php-fpm (`env[...]` trong pool, hoặc `.env`):

| Biến | Ý nghĩa |
|---|---|
| `ID_BASE_URL` | mặc định `http://127.0.0.1:8080` |
| `ID_INTERNAL_SECRET` | **phải trùng** `ID_INTERNAL_SECRET` của dịch vụ ID |

`idempotency_key` là **bắt buộc** và phải gắn với mã giao dịch của nhà cung cấp: mọi
cổng thanh toán đều bắn lại callback khi không nhận được 200, và không có khoá này thì
mỗi lần bắn lại là một lần cộng tiền.

Nạp thủ công (đền bù, hỗ trợ) làm ở trang quản trị `/nap-tay` — bắt buộc ghi lý do và
mọi lần nạp đều vào nhật ký.

## Biến môi trường

| Biến | Bắt buộc | Mặc định |
|---|---|---|
| `ID_ISSUER` | ✅ | — URL công khai, phải khớp `iss` trong token |
| `ID_DB_PASSWORD` | ✅ | — |
| `ID_SIGNING_KEY_PEM` | ✅ | — khoá RSA ≥ 2048 bit, PKCS#1 hoặc PKCS#8 |
| `ID_ADDR` | | `:8080` |
| `ID_DB_HOST` / `ID_DB_PORT` / `ID_DB_USER` / `ID_DB_NAME` | | `127.0.0.1` / `3306` / `root` / `platform` |
| `ID_ACCESS_TTL` / `ID_REFRESH_TTL` / `ID_CODE_TTL` | | `15m` / `720h` / `60s` |
| `ID_SESSION_TTL` | | `336h` |
| `ID_COOKIE_SECURE` | | `true` — đặt `false` khi chạy HTTP thuần lúc dev |
| `ID_LOGIN_MAX_ATTEMPT` / `ID_LOGIN_WINDOW` | | `10` / `15m` |
| `ID_INTERNAL_SECRET` | | khoá HMAC cho API nạp tiền nội bộ — để trống thì tắt endpoint đó |
| `ID_SMTP_HOST` / `ID_SMTP_PORT` | | — thiếu thì **tắt** khôi phục mật khẩu |
| `ID_SMTP_USER` / `ID_SMTP_PASSWORD` | | để trống nếu SMTP nội bộ không cần xác thực |
| `ID_SMTP_FROM` / `ID_SMTP_FROM_NAME` | | địa chỉ gửi; `FROM` bắt buộc để bật tính năng |
| `ID_BRAND_NAME` | | `Cổng game` — thương hiệu, trả qua `GET /api/site` (cả adapter cũng đọc biến này) |
| `ID_SUPPORT_URL` / `ID_FANPAGE_URL` / `ID_TOPUP_URL` / `ID_LEGAL_NOTE` | | rỗng — link hỗ trợ, fanpage, trang nạp Xu (rỗng = chưa có cổng nạp), dòng pháp lý ở chân trang |
| `ADMIN_PUBLIC` | | `0` — `1` = trang quản trị được nginx cho vào từ Internet: cookie ép `Secure`, phiên còn 4 giờ, và **không khởi động** nếu `owner` còn mật khẩu mặc định. Không đổi địa chỉ bind |
| `ADMIN_LOGIN_MAX_ATTEMPT` / `ADMIN_LOGIN_WINDOW` | | `8` / `15m` — ngưỡng khoá tạm khi đăng nhập quản trị sai, đếm theo tên đăng nhập **và** theo IP |
| `ADMIN_COOKIE_SECURE` | | `true` — đặt `false` khi chạy HTTP thuần lúc dev; `ADMIN_PUBLIC=1` bỏ qua giá trị này |

**Không có "chế độ ghi log" thay cho gửi email thật.** Một đường đặt lại mật khẩu in ra
log là một đường chiếm tài khoản cho bất kỳ ai đọc được log. Chưa cấu hình SMTP thì tính
năng tắt hẳn, và trang `/quen-mat-khau` nói rõ điều đó.

## Test

```bash
go test ./...                                   # bỏ qua test ví nếu không có DB
PLATFORM_TEST_DSN='root:pw@tcp(127.0.0.1:3306)/platform?parseTime=true' go test ./...
```

Phần ví chạy trên MySQL thật chứ không dùng bản giả lập, vì nó phụ thuộc vào giao dịch,
khoá dòng và ràng buộc duy nhất — một bản giả lập trong bộ nhớ sẽ bỏ qua đúng những
thứ cần kiểm.

## Ghi chú thiết kế

**Mật khẩu** dùng Argon2id (64 MiB, 3 vòng, 4 luồng). Chuỗi băm mang theo tham số của
chính nó nên nâng tham số sau này không làm hỏng bản ghi cũ — `NeedsRehash()` báo lúc
nào nên băm lại, và việc đó xảy ra ngay khi người dùng đăng nhập đúng.

**Ví** là sổ cái ghi kép, không phải một cột cộng trừ. Số dư là tổng của các dòng sổ
cái; mỗi giao dịch có `idempotency_key` duy nhất nên callback bắn lại không cộng hai
lần; và mọi giao dịch có tổng đại số bằng 0 nên tiền không tự sinh ra.

**Mật khẩu thật của người chơi không bao giờ tới cụm game.** Adapter giữ một khoá riêng
cho mỗi cặp (người dùng, game) để nói chuyện với login server, nên `tcg.account` trở
thành bảng ánh xạ nội bộ thay vì một kho tài khoản thứ hai.
