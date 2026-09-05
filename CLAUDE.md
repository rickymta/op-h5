# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. Bản chất của thư mục này

Đây **không phải repo mã nguồn** — đây là **bản snapshot của một môi trường triển khai (deployment) đang chạy trên Linux**, được copy về Windows. Không có `.git`, không có `pom.xml`/`build.gradle`, không có source Java, không có test suite, không có bước build.

Hệ thống là bản Việt hoá của một game H5 đấu tướng/idle gốc Trung Quốc (codebase nội bộ tên `tcg` — "叶子戏 / yezixi", gameId `10091`). Log, comment và tên sheet cấu hình đều bằng tiếng Trung; UI người chơi và GM tool bằng tiếng Việt.

Gồm 3 khối tách biệt:

| Khối | Vị trí | Công nghệ | Deploy path trên Linux |
|---|---|---|---|
| Backend game | `server/` | Java 8 + Spring Boot 2.5.1, đóng gói sẵn dạng JAR | `/h5/server/` |
| Client H5 + cổng nạp + GM tool | `website/game/` | LayaAir (JS obfuscated) + PHP 7 | `/www/wwwroot/game/` |
| Landing page | `website/home/` | PHP tĩnh | `/www/wwwroot/home.hanglong3d.com/` |

**Hệ quả quan trọng:** không thể sửa logic gameplay ở đây. Phạm vi làm việc thực tế chỉ gồm: file cấu hình (`config/env.yml`, `application.properties`), bảng Excel (`server/excel/release/`), script khởi động, và toàn bộ tầng PHP (`website/`).

Tài liệu kèm theo: [MISSING-FILES.md](MISSING-FILES.md) — kiểm kê file thiếu/hỏng và cách xử lý; [docs/excel-index.md](docs/excel-index.md) — bảng tra cứu 200 file Excel (Trung → Anh → Việt); `tools/fix-filenames.ps1` — script khôi phục tên file bị hỏng encoding.

---

## 2. Lệnh vận hành

Toàn bộ script giả định đang chạy trên Linux tại `/h5/server`, user `root`, JDK ở `/usr/local/jdk` (Java 1.8.0_261).

### Khởi động toàn bộ hệ thống

```bash
/h5/server/start.sh
```

`start.sh` khởi động RabbitMQ, restart MongoDB, rồi bật lần lượt các service **theo đúng thứ tự phụ thuộc** với các khoảng `sleep`:

```
console → world → meta → statistic → pay → group → game → login → cross
```

Thứ tự này bắt buộc: `console` phải sẵn sàng trước vì mọi service khác gọi `http://127.0.0.1:9999/conf/global/get` và `/env/*` lúc bootstrap để lấy cấu hình.

### Dừng toàn bộ

```bash
/h5/server/stop.sh
```

Đọc PID từ `/var/run/tcg-<name>.pid` và kill theo thứ tự ngược: `game, game2, game3, cross, group, statistic, meta, world, pay, login, console`. **Không được đổi thứ tự — tiến trình `game` bắt buộc phải tắt trước.**

Hai điểm cần lưu ý ở `stop.sh`:
- Dòng cuối `find /h5/server -name '*.log' | xargs rm -f` **xoá sạch mọi log**. Sao lưu log trước khi chạy nếu đang điều tra sự cố.
- Vòng lặp chỉ liệt kê tới `game3`, trong khi có sẵn `start2`..`start6`. Nếu chạy s4–s6 thì phải kill thủ công.

### Khởi động lẻ từng service

```bash
cd /h5/server/<service> && ./start
```

Mỗi thư mục có script `./start` chạy `nohup java -jar ... &` rồi ghi PID vào `/var/run/tcg-<name>.pid`.

### Nhiều game server trên cùng một máy

`server/game/` chứa `start`, `start2` … `start6`. Chúng dùng **chung một `tcg-game.jar`**, chỉ khác tham số `--sc`:

```bash
cd /h5/server/game && ./start3
```

`--sc=<srvCode>` quyết định server này là ai. Mọi thứ còn lại (MongoDB database, MySQL database, WebSocket port, cross group, excel mode, thời gian mở server) được nạp từ bảng `tcg.srv_game` qua Console — **không nằm trong file local**.

### Tham số dòng lệnh

| Service | Tham số | Ý nghĩa |
|---|---|---|
| game | `--v=0 --sc=s1` | `sc` = server code, tra trong bảng `srv_game` |
| cross | `--v=0 --cc=cross-yzx1 --p=20001` | `cc` = cross code, `p` = HTTP port |
| group | `--v=0 --gc=group-offical --p=30001` | `gc` = group code, `p` = HTTP port |

`--p` **ghi đè** `server.port` trong `application.properties` (ví dụ `group/application.properties` ghi `30002` nhưng thực tế bind `30001`).

### Không có test

Không có JUnit runner, không có test fixture, không có CI. Cách "kiểm thử" duy nhất là khởi động service rồi đọc log — xem mục 10.

---

## 3. Sơ đồ service và cổng

| Service | JAR | Port | Vai trò |
|---|---|---|---|
| **console** | `tcg-console-server` | **9999** | Trung tâm cấu hình + REST API cho GM. Mọi service khác phụ thuộc vào nó. |
| **login** | `tcg-login-server` | 9000 | Đăng nhập / đăng ký tài khoản, danh sách server |
| **meta** | `tcg-meta` | 12345 | Metadata cho client (version, announce) |
| **statistic** | `tcg-stat-server` | 7788 | Thống kê, log hành vi, truy vấn nhân vật (`role/record/list`) |
| **pay** | `tcg-pay-server` | 10010 | Xử lý đơn nạp |
| **world** | `tcg-world-server` | 10086 | Dịch vụ toàn cục (gift code, shop icon) |
| **group** | `tcg-group` | 30001 | Hoạt động liên server trong cùng nhóm |
| **cross** | `tcg-cross` | 20001 | Hoạt động cross-server (đấu trường, boss, xếp hạng) |
| **game** | `tcg-game` | **WS 8001** + HTTP 18001 | Tiến trình gameplay. Một tiến trình = một server. |

Về `game`: `wsPort=8001` là WebSocket cho client; Spring HTTP nội bộ nghe ở `wsPort + 10000 = 18001`. Server thứ N dùng cặp port riêng theo cấu hình DB.

**Lưu ý về `tcg-game.jar`:** đây là *thin JAR* — `MANIFEST.MF` khai báo `Class-Path: lib/...` trỏ tới 97 file trong `server/game/lib/`. Thư mục `lib/` **phải nằm cạnh JAR**, không được tách rời. Các service còn lại là fat JAR độc lập (~60–110 MB).

---

## 4. Mô hình cấu hình hai tầng

Đây là điểm dễ nhầm nhất khi làm việc với hệ này.

**Tầng 1 — file local (chỉ đủ để bootstrap):**

```
server/<service>/application.properties | application.yml   # server.port, logging.config
server/<service>/config/env.yml                             # secret, đường dẫn excel, địa chỉ console
server/<service>/config/logback.xml | ./logback.xml         # cấu hình log
```

`env.yml` của mỗi service (trừ console) hầu như chỉ chứa `consoleNP` — địa chỉ Console. Console tự nó là service duy nhất có đầy đủ thông tin MySQL/MongoDB trong `console/config/env.yml`.

**Tầng 2 — cấu hình phát từ Console (nguồn sự thật thực sự):**

- `console/store/global.conf.json` — trả về qua `GET /conf/global/get`. Chứa toàn bộ thông tin kết nối MySQL/MongoDB, địa chỉ `loginNP`/`statNP`/`payNP`/`worldNP` (LAN + WAN + domain), cấu hình RabbitMQ, `timezoneCode`, `langCode`, `gameVer`, `currencyCode`.
- Bảng `tcg.srv_game` / `srv_cross` / `srv_group_device` — trả về qua `/env/game`, `/env/cross`. Chứa: database code, port WebSocket, JVM args, excel mode, thời gian mở server, nhóm server.

**Suy ra:** muốn đổi host, port, database, thời gian mở server, hay bật/tắt một server — **sửa `global.conf.json` hoặc bảng trong MySQL `tcg`, không sửa `env.yml`.** Sửa `env.yml` phần lớn sẽ không có tác dụng.

`console/store/global.conf.json` hiện trỏ WAN về `192.168.1.69` — đây là giá trị phải đổi đầu tiên khi deploy sang môi trường khác.

`meta/store/meta.conf.json` giữ version client mà meta server công bố (hiện `1.2.99`).

---

## 5. Kho dữ liệu

| Kho | Database | Nội dung |
|---|---|---|
| MySQL | `tcg` | Nền tảng: `account`, `account_master`, `charge_item`, `wp_code`, `pay_approval`, `gm_mail_approval`, `gm_mail_tar`, `srv_game`, `srv_cross`, `srv_group_device` |
| MySQL | `stat` | Thống kê dài hạn: `pay_record` (console tự chuyển lịch sử nạp cũ sang đây mỗi phút — xem `PayHistoryMoveTask` trong log) |
| MySQL | `game_s1`, `game_s2`, … | Dữ liệu quan hệ riêng của từng game server, tự tạo khi khởi động |
| MySQL | `web` | Cổng nạp PHP: `user`, `card_log`, `log_xu`, `log_nap`, `knb`, `server`, `tichluy`, `timetichluy`, `diemdanh`, `admin_user` |
| MySQL | `cdks` | Bảng `cdk` cho GM tool `gmhanglong` |
| MongoDB | `tcg` | Dữ liệu nền tảng |
| MongoDB | per-server + `cross-yzx1`, `group-offical` | Dữ liệu nhân vật, kho đồ, tiến độ |
| MongoDB | `statistic` | Dữ liệu thống kê |
| RabbitMQ | — | Kênh `stat`, `cross`, `group`, `share`. Bật/tắt qua `global.conf.json` (`mqShare` hiện `enabled: false`) |

Múi giờ toàn hệ thống là `Asia/Ho_Chi_Minh`; JVM tự đổi timezone lúc khởi động theo `timezoneCode`.

---

## 6. Bảng cấu hình Excel — `server/excel/release/`

227 file Excel là **toàn bộ cấu hình gameplay** (tướng, đồ, phó bản, hoạt động, gói nạp, drop table…).

- **Tên file đã được đổi sang tiếng Anh** — xem mục 14. Server tra cứu theo tên file (giờ là tiếng Anh, ví dụ `../excel/release/hero-week-card.xlsx`) và **tên sheet vẫn là tiếng Trung** (ví dụ sheet `皮肤激活道具`). Bảng ánh xạ: `tools/excel-name-map.json`.
- Đường dẫn khác nhau tuỳ service:
  - `game/config/env.yml`: `excelDir: ../excel/$MODE/` — `$MODE` lấy từ `SrvGame.excelMode` (hiện `release`)
  - `world`, `pay`, `cross`: `../excel/release/`
  - `group/config/env.yml`: `../excel/` ← **thiếu `release/`**, nghi vấn cấu hình sai
- `templateIgnore.json` liệt kê các sheet **cố tình bỏ qua** khi nạp (bảng runtime/bảng bot, ví dụ `跨服天梯实例`, `竞技场机器人主角库`). Thêm sheet vào đây để server không cố parse.
- `dongtaitishi.txt` là danh sách tooltip tiếng Việt hiển thị lúc loading, phân tách bằng `#`.
- `readme.txt` rỗng.

Nạp lại cấu hình khi server đang chạy — không cần restart:

```
POST http://127.0.0.1:9999/srv/game/cmd/excel/reload
```

### Nguồn JSON — `server/excel-src/` (từ 2026-09-04)

Server **chỉ nạp được .xlsx** (`EExcel.load` mở file bằng POI theo tên file + tên sheet hardcode trong bytecode), nên định dạng server nạp không đổi được. Thay vào đó toàn bộ 203 workbook .xlsx (933 sheet, ~2 triệu ô) đã được xuất ra JSON để đọc/diff/sửa, và **JSON là nguồn sự thật**; xlsx trong `excel/release/` là sản phẩm biên dịch:

```
server/excel-src/<tên-file-không-đuôi>/_index.json   # tên workbook + danh sách sheet theo thứ tự
server/excel-src/<tên-file-không-đuôi>/NN.json       # một sheet: {"sheet": "皮肤激活道具", "rows": [[...], ...], "formulas": {...}, "merged": [...]}
python tools/excel-to-json.py            # Excel -> JSON (làm lại khi nhận Excel mới từ nhà phát hành)
python tools/json-to-excel.py --verify   # JSON -> build/excel-regen/*.xlsx, so từng ô với bản gốc
python tools/json-to-excel.py --probe    # chạy ExcelProbe (parser THẬT của game) trên cả hai bản, so kết quả
python tools/json-to-excel.py --out server/excel/release   # ghi đè file server nạp, rồi POST .../excel/reload
```

Quy ước trong JSON: `rows` là **mọi dòng từ dòng 1** (dòng đầu là header), mỗi ô giữ nguyên kiểu (số là số, chuỗi là chuỗi — với server `"123"` và `123` khác nhau, xem mục 11.5), `null` là ô **thiếu hẳn** (không có phần tử `<c>` trong XML), `""` là ô **có mặt nhưng trống** hoặc chuỗi rỗng, `{"$error":"#N/A"}` ô lỗi, `{"$date":"..."}` ô ngày. Phân biệt `null` và `""` là bắt buộc: `XSSFRowWrap` (tcg-common) trả **giá trị mặc định** cho ô thiếu nhưng trả `""` cho ô có mặt-trống, kể cả `getInteger`, nên `json-to-excel.py` biên dịch `""` thành `<c r=".."/>` đúng như Excel ghi ô có định dạng. Ô công thức mang **giá trị đã tính** (đúng thứ server nhìn thấy), công thức gốc chỉ nằm trong `formulas` để tham khảo — xlsx biên dịch lại không còn công thức. Tên sheet vẫn tiếng Trung và nằm trong trường `sheet` (file đặt theo số thứ tự để tránh hỏng encoding tên file). `json-to-excel.py` tự chạy `xlsx-inline-to-shared.py` cho từng file và ghi số thực bằng `repr()` (openpyxl mặc định `%.16g`, làm lệch 1 ulp ở giá trị 17 chữ số như `336.40000000000003`). `ExcelProbe` giờ tự `System.exit` vì một số loader (ArenaExcel…) để lại thread nền làm JVM treo. Bảng file → lớp loader ở `docs/excel-loaders.json` (sinh bởi `tools/excel-loaders.py` từ constant pool). `.xlsm` (4 file, không được bytecode tham chiếu) và file rác `%3F` không được xuất.

Muốn đưa cấu hình lên **database** thì đi qua chính đường này: DB → sinh JSON (hoặc xlsx) → `excel/reload`; server không có driver nào đọc cấu hình từ DB.

---

## 7. Console REST API

Console (`:9999`) là bề mặt điều khiển duy nhất của hệ thống. Danh sách **đầy đủ** endpoint được in ra ngay dòng `LoginConfig ... LoginFilter.urlPatterns` trong `server/console/.logs/info.log` — đây là cách nhanh nhất để tra API mà không cần decompile JAR.

Nhóm chính:

| Nhóm | Ví dụ | Công dụng |
|---|---|---|
| Auth | `POST /staff/login` | Trả token, dùng ở header `Login-Token` cho mọi call sau |
| Điều khiển server | `/srv/game/cmd/start`, `/stop`, `/cmd/excel/reload`, `/cmd/script/reload`, `/cmd/cross/reload`, `/srv/game/jvm/info`, `/srv/game/gc` | Bật/tắt/nạp lại server |
| Cross / Group | `/srv/cross/cmd/*`, `/srv/group/cmd/*` | Quản lý cụm liên server |
| Gộp server | `/srv/merge/*`, `/srv/merge/migrate/game/mongo` | Merge server |
| GM — thư | `/gm/mail/x/create`, `/gm/mail/x/complete`, `/gm/mail/noReward/complete` | Gửi vật phẩm qua hòm thư |
| GM — nạp | `/gm/pay/createApproval`, `/gm/pay/completeApproval`, `/gm/pay/manual` | Nạp thủ công |
| GM — kỷ luật | `/gm/freeze/create`, `/gm/chat/forbid/create` | Khoá tài khoản, cấm chat |
| GM — khác | `/gm/announce/*`, `/gm/notice/*`, `/gm/rebate/*`, `/gm/vipService/*` | Thông báo, hoàn trả, VIP |
| Nhân vật | `/role/bag/query`, `/role/bag/reduce`, `/role/wallet/query`, `/role/wallet/reduce` | Đọc/trừ kho đồ và ví |
| Cấu hình | `/conf/global/get`, `/conf/global/set`, `/env/game`, `/env/cross` | Cấu hình tầng 2 |

`bagType` dùng trong `/role/bag/*`: `1` tướng, `2` trang bị, `3` đạo cụ, `4` mảnh ghép, `5` mặc ấn, `6` thú hồn, `7` tiên khí, `8` mảnh tiên khí, `13` sưu tập.

Truy vấn nhân vật theo tên đi qua **statistic** chứ không phải console:
`GET http://127.0.0.1:7788/role/record/list?srvCode=s1&roleName=<urlencoded>&page=1&pageSize=10` → trả `roleId`, `accountUid`, `platformCode`.

---

## 8. Tầng PHP: cổng nạp và GM tool

Bốn panel song song, viết ở các thời điểm khác nhau, chồng chéo chức năng:

### `website/game/api/` + `website/game/user/` — cổng người chơi
Đăng ký/đăng nhập web (`api/config.php` với `act=login|reg|mlogin|mreg|nhanxu|pwd`), nạp thẻ cào (`card.php` → API bên thứ ba `thesieutoc.net`), callback ngân hàng/MoMo, lịch sử giao dịch. Tiền ảo trung gian gọi là **"xu"**, lưu ở `web.user.xu`.

`getSession.php` là cầu nối web↔game: client LayaAir gọi `http://<host>/api/getSession.php?u=&p=` để tạo/xác thực session, **tự động tạo tài khoản mới nếu chưa tồn tại**.

`id.txt` (1984 dòng, định dạng `payId;giáXu`) là bảng giá gói nạp mà `api.php`/`apisv.php` đối chiếu trước khi trừ xu.

### `website/game/gm/` — GM tool cũ
Gửi thư hệ thống theo nhân vật hoặc toàn server. Ghi thẳng vào MySQL `tcg` (`gm_mail_approval` + `gm_mail_tar`) rồi gọi console `/gm/mail/x/complete` để đẩy đi. Danh sách server hardcode trong `gm/user/function/common.php::get_qu_list()` (S1–S5). Mã GM nằm ở biến `$gmcode` trong `gm/config.php`.

### `website/game/gmhanglong/` — GM tool hiện dùng
Đầy đủ hơn: nạp, gửi thư, xoá kho đồ theo loại, CDK, webshop, tích luỹ. Đăng nhập console bằng `staff/login` rồi tái sử dụng token. Cấu hình tập trung ở `gmhanglong/config/config.php` (mảng `$PZ`), mã uỷ quyền ở `$gm_code`.

### `website/game/adminphp@2024/` và `adminhl@2024/admtool/`
`adminphp@2024` là dashboard doanh thu tự viết (PHP + MySQL `web`); `rev.php` là endpoint JSON tổng hợp doanh thu, bảo vệ bằng một query key tĩnh. `adminhl@2024/admtool` là bản build React (create-react-app) của GM console chính thức "GMC-2"; môi trường chọn qua `admtool/env.local.js` (`document.env_local_mode`, hiện `release`).

### Luồng nạp tiền đầy đủ

```
Người chơi nạp thẻ/bank/MoMo
  → website/game/api/{card,cardCallback,bankCallback,momoCallback}.php
  → cộng "xu" vào web.user
  → user/webshop.php → new/config.php → gmhanglong/gm/{webshop,tichluy,coin}.php
  → INSERT tcg.pay_approval  (hoặc tcg.gm_mail_approval + gm_mail_tar)
  → POST console :9999/gm/pay/completeApproval  (hoặc /gm/mail/x/complete)
  → game server phát vật phẩm cho nhân vật
```

Route đẹp do nginx rewrite: `/play-game`, `/nap-tien`, `/tai-khoan`, `/lich-su`, `/tich-luy`, `/doi-knb`, `/web-shop`, `/user-<act>` và `/act-<act>` → `api/config.php?act=<act>` (đăng nhập/đăng ký web đi qua `/user-mlogin`, `/user-mreg`). File nginx gốc (aaPanel) nằm ở `www/server/panel/vhost/{nginx,rewrite}/192.168.1.69.conf` (thư mục `www/` gitignored); toàn bộ rewrite đã được chép vào `docker/nginx/game.conf`.

---

## 9. Client H5 — `website/game/`

Engine là **LayaAir** (không phải Cocos). Tên file cố tình băm để chống tải lậu.

Chuỗi nạp:

```
play.php                        → định nghĩa appVersion, nạp a3b31-4c087-1dc2f.js
a3b31-4c087-1dc2f.js            → ydwxConfig (basePath, metaDataServer :12345,
                                   statisticServer :7788, gameId 10091, platform yezixi)
                                   rồi loadLib() lần lượt:
  libs/0c1cc…, 0c12c… (pako), 0e8e7… (zlib.js), fe8a3… (md5)
  libs/6c019…, 70b25…, 9e1f8…   → module LayaAir (HTML, Skeleton, UI)
  libs/b025d-4e5e6-14e03.js     → engine core LayaAir, ~1 MB, đã obfuscate
  libs/e228b-0b904-ac44c.js     → toàn bộ logic game, ~9.4 MB, đã obfuscate
  libs/795bf-bff72-0d910.js     → loader tải libs/2af72-f100c-2af72.json
                                   (JSON nén deflate) = manifest version/tài nguyên
```

- `res/` — 10.584 file, ~1.5 GB, tên băm không có đuôi mở rộng (nội dung thật là PNG/JSON…)
- `5c597-36b84-cbdb1.json` — bản đồ atlas → danh sách sprite
- `8e40e-89c8c-95a05.js` — devtools-detector (chống mở DevTools), hiện **đã bị comment out** trong loader
- `bmFont/`, `spine/`, `sound/`, `icon/`, `img/` — tài nguyên rời
- `ios.html`, `hiente.php` — biến thể loader cho iOS / domain khác (chú ý `appVersion` khác nhau: `play.php` = 28.3, `hiente.php` = 5.9)
- `version` — `{"Name":"Newworld AFK","Version":"1.4"}`

Client gọi thẳng: `:9000` (login), `:12345/announce/one`, `:7788/client/error/log` và `/login/flow/add`, `:9999/status`, `/api/getSession.php`.

### Bỏ qua màn hình đăng nhập của client (từ 2026-09-05)

Người chơi đã đăng nhập ở hệ thống ID không phải đăng nhập lần thứ hai ở client:

- `play.php` gọi `POST $ADAPTER_BASE_URL/api/game/session` **phía server**, chuyển kèm cookie
  `haitac_sess`, rồi nhúng kết quả vào `window.__opAuto`. Làm ở server vì cookie là HttpOnly,
  và vì cổng chặn tải phải chạy *trước* khi client kịp tải 9,4 MB tài nguyên.
- `op-autologin.js` tìm màn hình đăng nhập bằng **hành vi** (đối tượng nào có cả
  `onAccLoginComplete` lẫn `accountLogin` — hai tên này không bị obfuscate), điền ô `dAcc`,
  rồi gọi thẳng `onAccLoginComplete({errorcode:0, data: <nguyên văn data của login server>})`.
  Không gửi khoá game xuống trình duyệt: Adapter đã đăng nhập hộ ở phía server.
- Sau đó gọi `selectServer()` với đúng máy chủ cổng chặn tải đã cấp — **chỉ khi `_masterList`
  rỗng**. Ai đã có nhân vật thì để client tự chọn máy chủ của nhân vật đó.
- Hỏng ở bất kỳ bước nào (không có cookie, Adapter từ chối vì quá tải, không tìm thấy màn
  hình) đều lùi về luồng cũ: client hiện form đăng nhập của nó. Lý do từ chối nằm ở
  `window.__opAutoErr`.
- Client đọc **đúng ba** trường trong `data`: `token`, `account`, `masterList` (đo bằng Proxy
  trên client thật). Thiếu `masterList` thì client đăng nhập xong nhưng **đứng ở màn hình
  trắng, không báo lỗi** — vì nó không biết nên hiện danh sách server hay vào nhân vật cũ.

---

## 10. Đọc log

```
server/<service>/.logs/info.log                      # log hiện tại
server/<service>/.logs/error.log
server/<service>/.logs/info/info-YYYY-MM-DD.N.log    # đã xoay vòng
```

Riêng `game`, `cross`, `group` có thêm một cấp thư mục theo instance:

```
server/game/.logs/game-s1/info.log
server/cross/.logs/cross-cross-yzx1/info.log
server/group/.logs/group-group-offical/info.log
```

Log là kênh chẩn đoán chính vì không có source. Vài dòng đặc biệt đáng giá:
- `console/.logs/info.log` — dòng `LoginFilter.urlPatterns` liệt kê **toàn bộ REST API**.
- `game/.logs/game-s1/info.log` — dòng `游戏启动配置：GameLoading(...)` in ra **toàn bộ cấu hình đã resolve** của server đó (mongo, mysql, wsPort, cross, group, thời gian mở). Đây là cách xác thực cấu hình nhanh nhất.
- Dòng `Spring 启动完毕 tcg-game-server 版本: 1.5.0-SNAPSHOT 构建时间: 2022-03-30 ...` cho biết chính xác build đang chạy (branch `release/sf-2022-03-30`).

Log ghi tiếng Trung; từ khoá hay gặp: `配置` cấu hình, `找不到` không tìm thấy, `加载错误` lỗi nạp, `跨服` cross-server, `充值` nạp tiền, `邮件` thư.

---

## 11. Vấn đề đã biết trong snapshot này

Những lỗi dưới đây có thật, quan sát được từ log và filesystem. Đừng nhầm chúng với regression do thay đổi mới.

1. ~~Tên file Excel bị hỏng encoding~~ — **ĐÃ XỬ LÝ.** Bản copy về Windows có 285 file hỏng tên qua 3 kiểu (211 mojibake CP1252←UTF-8, 55 percent-encoded, 19 dạng `%3F`). Đã chạy `tools/fix-filenames.ps1 -Apply`: 265 file khôi phục tên đúng; hiện không còn file mojibake hay percent-encoded nào. 19 file `%3F` cộng `资质信息.json` là bản trùng đã xác minh MD5, vẫn còn trên đĩa — xoá bằng `-RemoveDuplicates`.

2. **`group` chết vì OutOfMemoryError.** `group/.logs/group-group-offical/error.log`: `GC overhead limit exceeded` khi tạo bean `env`. Nguyên nhân: `group/start` dùng `-Xmx512m` trong khi cấu hình DB (`SrvGroupDeviceEntity.jvmArgs`) ghi `-Xmx1128m`. Sửa ở `server/group/start`.

3. **`world` lỗi parse Excel lúc khởi động.** `NullPointerException` tại `SrvEnv.gameVer` khi decode sheet `皮肤激活道具` row 700001 → làm hỏng bean `GameSheets`. Bắt nguồn từ `gameVer` chưa được set khi world nạp excel.

4. **Nhiều file/sheet Excel bị thiếu.** `game` log hàng loạt `excel配置文件不存在`: `英雄周卡.xlsx`, `BT月卡.xlsx`, `BT假累计充值.xlsx`, `BTBUG商店.xlsx`, `好友邀请.xlsx`, `0元购.xlsx`, `热江英雄升星.xlsx`, `仙玉商城.xlsx`, `bt首充.xlsx`, `BT潘达福利.xlsx`, và các sheet `仙玉基金`, `元宝基金`, `冠军赛竞猜随机奖励`, `三十六重天排行榜`. Các tính năng tương ứng sẽ không hoạt động. **Cập nhật 2026-09-03:** 10 file thiếu đã xử lý — 5 tái tạo từ bytecode (`reconstructed/`, chưa copy vào `excel/release`), 5 file BT không cần vì `gameVer=MAINLAND`. Xem [docs/missing-excel-reconstruction.md](docs/missing-excel-reconstruction.md). 6 sheet thiếu bên trong workbook cũng đã chèn (`tools/xlsx-add-sheet.py`). Tất cả **đã nằm trong `server/excel/release/`**; bản gốc 4 workbook bị sửa ở `reconstructed/originals/`.

5. **Lỗi kiểu dữ liệu ô Excel.** `Cannot get a STRING value from a NUMERIC cell` ở các sheet `英雄高阶献祭星级`, `每日邀请`, `估值`, `鸿运当头礼包`, `圣诞树奖励`. Cần định dạng ô về Text trong file nguồn.

6. **`gmhanglong/gm/coin.php` được gọi nhưng không tồn tại.** `new/config.php` POST tới file này ở 5 chỗ. Chức năng đổi xu → KNB đang hỏng.

7. **`cross` kết nối bị từ chối lúc `game` khởi động.** `Connect to 192.168.1.69:20001 failed` — do `start.sh` khởi động `cross` **sau** `game`. Tự khỏi sau khi cross lên. Nếu lỗi kéo dài thì cross thực sự đã chết.

8. **`server/erl_crash.dump`** (770 KB, 19/08/2025): RabbitMQ chết vì `dist_port_already_used, 25672` — một instance Erlang khác đang giữ port. File chỉ là tàn dư, xoá được.

9. **Hardcode `192.168.1.69` khắp nơi.** Rải trong `global.conf.json`, `a3b31-4c087-1dc2f.js`, `play.php`, `new/config.php`, `new/webshop.php`, `adminphp@2024/check.php`. Đổi IP triển khai phải grep toàn bộ cả hai cây thư mục.

10. **`group/config/env.yml` đặt `excelPath: ../excel/`** trong khi file thật nằm ở `../excel/release/`.

---

## 12. Lưu ý bảo mật khi thao tác

Snapshot này chứa **credential thật ở dạng plaintext** rải rác — mật khẩu MySQL/MongoDB/RabbitMQ trong `console/config/env.yml`, `console/store/global.conf.json`, `statistic/config/env.yml` và trong **mọi** file PHP kết nối DB; tài khoản admin console trong `gmhanglong/config/config.php`; một JWT `Login-Token` đã hết hạn hardcode trong `gm/user/function/common.php`; API key nhà cung cấp thẻ cào trong `api/card.php`; signature callback MoMo trong `api/momoCallback.php`; query key của `adminphp@2024/rev.php`; keystore `login/fs-huawei.yezixigame.com.keystore`.

Ngoài ra tầng PHP có các điểm yếu cấu trúc cần biết trước khi sửa:
- Hầu hết truy vấn nối chuỗi trực tiếp từ `$_GET`/`$_POST`, chỉ được che bằng một regex chặn từ khoá SQL (hàm `StopAttack()` lặp lại ở gần như mọi file) — không phải prepared statement.
- Mật khẩu người dùng lưu và so sánh dạng plaintext (`api/getSession.php`, `adminphp@2024/db.php`).
- `adminphp@2024/db.php` kiểm tra `rowCount() < 0` (luôn false) nên **đăng nhập admin luôn thành công**.
- Các endpoint GM chỉ được bảo vệ bằng một mã chuỗi tĩnh.

Khi sửa file trong khu vực này: **không log, không copy, không đưa credential ra ngoài file gốc**. Nếu cần đổi cấu hình, sửa tại chỗ. Nếu người dùng yêu cầu vá lỗ hổng, ưu tiên `api/getSession.php`, `adminphp@2024/db.php` và các truy vấn nối chuỗi trong `api/config.php`.

---

## 13. Quy ước khi làm việc trong repo này

- **Đừng đổi tên file Excel bằng tay.** Tên file là khoá tra cứu hardcode trong bytecode. Đã có bộ vá đồng bộ (mục 14) — muốn đổi thêm thì sửa `tools/excel-name-map.json` rồi chạy lại tool, không rename thủ công.
- **Đừng đổi tên sheet.** Tên sheet (824 sheet) vẫn là tiếng Trung và cũng hardcode trong bytecode; bộ vá hiện tại **không** xử lý tên sheet.
- **Đừng đổi thứ tự trong `start.sh`/`stop.sh`** trừ khi hiểu rõ phụ thuộc ở mục 2.
- **Sửa cấu hình runtime qua Console/MySQL, không qua `env.yml`** (mục 4).
- Sau khi sửa Excel: gọi `/srv/game/cmd/excel/reload` thay vì restart server.
- Encoding: mọi file text (PHP, YAML, Excel) là UTF-8. Trên Windows, đọc/ghi phải chỉ định UTF-8 rõ ràng, nếu không sẽ tạo thêm mojibake như mục 11.1.
- File PHP trong `website/` dùng tab để thụt đầu dòng và trộn lẫn comment tiếng Việt/tiếng Trung — giữ nguyên phong cách của file đang sửa.
- Log không được lưu trữ lâu; `stop.sh` sẽ xoá sạch.

---

## 14. JAR đã bị vá: tên file Excel chuyển sang tiếng Anh

**Đây là thay đổi lớn so với binary gốc của nhà phát hành. Đọc mục này trước khi thay bất kỳ JAR nào.**

### Đã làm gì

Mỗi lớp con của `com.ososx.tcg.game.config.EExcel` khai báo tên file bằng một hằng số:

```java
public abstract class EExcel {
    public abstract String getFileName();          // moi loader override
    public abstract ESheet[] getSheets();
}
// truoc:  ldc "英雄周卡.xlsx"
// sau:    ldc "hero-week-card.xlsx"
```

188 tên file như vậy được vá **trực tiếp trong constant pool** của class file — không decompile, không recompile. An toàn vì mọi thứ trong class file tham chiếu constant pool bằng *index* chứ không bằng byte offset, nên đổi độ dài một `CONSTANT_Utf8` không ảnh hưởng code offset, `StackMapTable` hay `LineNumberTable`.

Kết quả: **969 hằng số trong 969 class thuộc 10 JAR**, kèm 178 file Excel trên đĩa được rename tương ứng.

| JAR | Class đã vá |
|---|---|
| `world/tcg-world-server-*.jar` | 198 |
| `game/tcg-game.jar` | 196 |
| `cross/tcg-cross.jar` | 189 |
| `group/tcg-group.jar` | 189 |
| `statistic/tcg-stat-server-*.jar` | 182 |
| `game/lib/tcg-common-*.jar`, `pay`, `console`, `login`, `meta` | 3 mỗi cái |

Với các fat JAR, class nằm trong **nested jar** `BOOT-INF/lib/tcg-game-server-*.jar` và `tcg-common-*.jar`, nên bộ vá xử lý 2 tầng và **giữ nguyên `compress_type`** của từng entry — nested jar bắt buộc phải là STORED, nếu nén lại thì Spring Boot loader không đọc được.

`console`/`login`/`meta` không nạp excel gameplay nhưng vẫn nhúng `PayItemExcel`, `LangExcel`, `LangSysExcel`, nên phải vá cùng để mọi service tìm chung một tên file.

### Kiểm chứng đã thực hiện

- Cấu trúc: 10/10 JAR số entry không đổi, CRC hợp lệ, `MANIFEST.MF` giống bản gốc, không nested jar nào rời khỏi STORED.
- Bytecode: `javap` của JDK 21 đọc lại được, thấy `ldc // String hero-week-card.xlsx`.
- Runtime: JVM thật nạp + link + verify class rồi gọi `getFileName()` trả về đúng tên tiếng Anh (`HCExcel`, `JadeExcel`, `ItemExcel`, `PayExcel`, `ChampionExcel`, `FriendInviteExcel`).
- Quét lại: 0 hằng số nào còn là tên file tiếng Trung.

**Đã kiểm chứng bổ sung (2026-09-03):** tải lại toàn bộ 178 file Excel từ server `pgaming` qua `stage-excel-for-download.sh` + WinSCP, đối chiếu bằng `tools/verify-excel-download.py`: **178/178 MD5 khớp `_md5-server.txt` (truyền tải không hỏng) và 178/178 khớp bản local byte-for-byte.** Bộ Excel trong `server/excel/release/` là bản sao chính xác của server. Server cũng có đúng 227 file như local (178 + 49 còn lại).

**Chưa kiểm chứng được:** khởi động thật trên Linux với đủ MySQL/MongoDB/RabbitMQ/console và JAR đã vá. Đây là bước còn lại phải làm trên môi trường thật.

### Công cụ

**Trên Windows (bản snapshot này):**

```bash
python tools/patch-excel-names.py                        # dry-run, xem se va gi
python tools/patch-excel-names.py --apply                # va bytecode
python tools/patch-excel-names.py --verify               # dem hang so da la ten Anh
python tools/patch-excel-names.py --rename-files --apply # doi ten file excel that
```

**Trên server Linux:** dùng `tools/rename-excel-on-server.sh` (bash thuần, không cần python — CentOS 7 không chắc có python3). Script được **sinh tự động từ `excel-name-map.json`**, sửa mapping thì phải sinh lại.

```bash
./rename-excel-on-server.sh                        # dry-run
./rename-excel-on-server.sh --apply                # doi ten
./rename-excel-on-server.sh --import DIR --apply   # copy file thieu tu DIR
./rename-excel-on-server.sh --revert --apply       # doi nguoc ve tieng Trung
./rename-excel-on-server.sh --dir /duong/dan       # doi thu muc dich
```

Mặc định `EXCEL_DIR=/h5/server/excel/release`. Script idempotent — chạy lại không làm gì thêm.

**Thứ tự triển khai bắt buộc:** tắt server → backup `excel/release` → upload 10 JAR đã vá → rename → import file thiếu → bật server.

**Chuyển script lên server bằng scp/sftp, tuyệt đối không copy-paste nội dung.** Phiên SSH tới `pgaming` render UTF-8 thành Latin-1 (`è‹±é›„.xlsx` = `英雄.xlsx`) và paste tiếng Trung thành `?`. Script chứa tên UTF-8 dạng byte, bash so byte với filesystem nên chạy đúng dù terminal hiển thị sai. Trên server có sẵn file rác `??.xlsx` nên lệnh paste tay sẽ copy nhầm không báo lỗi — xem MISSING-FILES.md B2. Cần tìm một file cụ thể trên server: dùng `md5sum -- *.xlsx | grep '^<md5>'`, không dùng tên.

Lấy file ra khỏi server với tên ASCII an toàn: `tools/stage-excel-for-download.sh` (copy ra `/tmp/excel-staging`, không đụng file gốc, đóng tar riêng cho file ngoài bảng ánh xạ). Rename mà chưa upload JAR đã vá thì mọi bảng cấu hình sẽ báo `excel配置文件不存在`.

- Bảng ánh xạ: `tools/excel-name-map.json` (188 cặp). Tool tự báo lỗi nếu có tên tiếng Anh trùng nhau.
- Bộ vá **chỉ thay `CONSTANT_Utf8` khớp chính xác toàn chuỗi** với một key trong bảng — nên các jar khác cũng chứa `.xlsx` (POI) không bị chạm tới.
- JAR gốc lưu tại `_backup-jars-original/` (106 JAR, 667 MB). Muốn quay lại tên tiếng Trung: copy backup về rồi chạy `--rename-files` với bảng đảo ngược.

### Bắt buộc phải biết

1. **Thay JAR mới từ nhà phát hành = mất toàn bộ.** Phải chạy lại `--apply` trên JAR mới.
2. **File Excel bổ sung sau này phải lưu bằng tên tiếng Anh.** 10 file đang thiếu (xem [MISSING-FILES.md](MISSING-FILES.md)) khi lấy từ bản gốc về phải rename theo `excel-name-map.json`, ví dụ `英雄周卡.xlsx` → `hero-week-card.xlsx`.
3. **Tên sheet vẫn là tiếng Trung** (824 sheet) và cũng hardcode trong bytecode. Bộ vá này không xử lý sheet. Mở `hero.xlsx` vẫn thấy tab tiếng Trung — vẫn cần [docs/excel-index.md](docs/excel-index.md).
4. **22 workbook vẫn giữ tên tiếng Trung** vì không có hằng số nào trong bytecode tham chiếu tới chúng (`历练副本.xlsx`, `榜单.xlsx`, `参考价值.xlsm`, `装备表_1.xlsx`, `序章.xlsx`…). Đổi tên chúng không có lợi ích gì mà thêm rủi ro.
5. **5 chuỗi log/mô tả menu GM vẫn nhắc tên tiếng Trung** (ví dụ `'来自 文本语言表.xlsx/文本库'`). Đó là văn bản thông báo, không phải lệnh mở file, nên vô hại — chỉ hơi bất nhất khi đọc log.

### Tái tạo file Excel thiếu & kiểm chứng cấu hình

- `reconstructed/` — 5 file Excel tái tạo từ schema trong bytecode + `originals/` (4 workbook trước khi chèn 6 sheet). Từ 2026-09-03 toàn bộ **đã nằm trong `server/excel/release/`**; 3 file (`friend-invite`, `free-buy`, `rejiang-hero-starup`) và sheet `冠军赛竞猜随机奖励` mang giá trị đặt tạm — xem [docs/missing-excel-reconstruction.md](docs/missing-excel-reconstruction.md).
- `tools/xlsx-add-sheet.py` — chèn sheet vào workbook có sẵn ở mức XML, không phá formula cache/định dạng.
- `tools/SheetProbe.java` — kiểm chứng **một** `ESheet` cụ thể (dùng khi loader cả workbook như `PayExcel` không tự thoát vì thread nền; luôn bọc `timeout`). Không truyền tên sheet tiếng Trung qua dòng lệnh Git Bash — thành `????` và glob khớp thư mục.
- `tools/ExcelProbe.java` — nạp một file cấu hình bằng **chính parser của game** (`EExcel.load` + `decode`) và in field. Dùng để kiểm chứng bất kỳ file Excel nào trước khi đưa lên server; mạnh hơn mọi kiểm tra bằng openpyxl/POI thuần.
- `tools/xlsx-inline-to-shared.py` — **bắt buộc** chạy cho mọi xlsx sinh bằng openpyxl: `XSSFRowWrap.getString()` gọi `setCellType(STRING)` làm ô `inlineStr` mất giá trị, server nhận chuỗi rỗng không báo lỗi. Excel-save không bị.
- `docs/sheet-headers.json` — header của 941 sheet trong 200 workbook; dùng để tìm file "anh em" cùng khuôn khi cần dựng cấu hình mới.
- Đọc cột theo **tên** (`XSSFRowWrap.getInteger("开启天数", default)`), thứ tự cột không quan trọng, cột thừa bị bỏ qua, cột có default thì tuỳ chọn.

---

## 15. Triển khai bằng Docker (máy 4 CPU / 8 GB / 40 GB SSD)

Toàn bộ nằm trong `docker/` — đọc [docker/README.md](docker/README.md) trước khi làm gì; quy trình chuyển server theo thứ tự có điểm kiểm tra ở [docs/deploy-runbook.md](docs/deploy-runbook.md). Tài nguyên client ở GitHub Release `assets-v1` (`client-assets.tar.gz`, 1.33 GB, sha256 `ca828abb…`), bootstrap tự tải. Điểm cốt lõi:

- **`network_mode: host` cho mọi container.** Cấu hình (file lẫn dòng trong MySQL `tcg.srv_game`/`cloud_server`) đều trỏ `127.0.0.1`; host network là cách duy nhất không phải sửa dữ liệu trong DB. Phải tắt MySQL/Mongo/MQ/Java cũ trên máy trước khi `up`. Chỉ Linux.
- **Thứ tự khởi động** = `start.sh` gốc, ép bằng `depends_on` + healthcheck TCP: `console → world → meta → statistic → pay → group → game → login → cross → web`. Toàn chuỗi 5–8 phút.
- **RAM:** tổng `-Xmx` gốc ≈ 8 GB, không vừa. Heap đã cắt (mặc định tổng 4992m trong `.env.example`), `SerialGC`, `MaxMetaspaceSize=160m`, `Xss512k`; MySQL buffer pool 192M, Mongo cache 0.25 GB, MQ 256MB. Trần `mem_limit` cộng lại 9.69 GB nhưng peak không chồng nhau; **bắt buộc swap 4 GB**. Chỉ chạy 1 game server.
- **MySQL khởi tạo từ seed sạch trong git** (`docker/initdb/mysql/seed/*.sql`, từ 2026-09-05): không JAR nào chứa schema `tcg/stat/web/cdks` (ORM MyBatis-Plus, không auto-DDL), nên `tools/dump-to-seed.py` rút từ dump thật ra schema đủ 4 DB + dữ liệu của ~20 bảng cấu hình (`srv_game` s1, `srv_group(_device)`, `srv_cross`, `cloud_device/mysql/mongo/mq`, `app`, `srv_game_access`, `dynamic_conf`, `staff*`, `web.tichluy/webshop`), che sạch bí mật (tool tự kiểm, `--check`). `docker/initdb/mysql/zz-init.sh` (chạy lần đầu volume trống) nạp seed khi không có dump, rồi **dù seed hay dump**: ghi mật khẩu `.env` vào `tcg.cloud_*` (game/cross/group lấy credential ở đó, không đọc `env.yml`), `CONSOLE_ADMIN_PASSWORD` vào `tcg.staff`, `PUBLIC_HOST` vào `cloud_device`/`srv_login`, URL cross/group → `127.0.0.1`, tắt giới hạn platform ở `srv_game_access` (login chỉ hiện máy chủ có dòng access khớp; Adapter gọi `/srv/game/list` không kèm `platformCode`), thêm máy chủ theo `GAME_SERVERS`. Hệ quả: `.env` không cần khớp server cũ; dump (`docker/prepare-dumps.sh` → `docker/initdb/{mysql,mongo/dump}`, gitignored) chỉ để giữ tài khoản/nhân vật cũ; Mongo và `game_sX` không cần dump (service tự tạo). `docker/gen-env.sh <host>` sinh `.env` với bí mật ngẫu nhiên; `server-bootstrap.sh` gọi nó rồi `up -d` luôn.
  Đo thực tế trước đó: với `tcg` **rỗng**, `console`, `world`, `meta`, `statistic` vẫn khởi động; `game`, `group`, `cross` không (đọc `srv_game` / `srv_group_device` để biết mình là ai), `login` không (`/srv/game/list`, `/account/*` đọc `tcg`). Đó là lý do seed phải có các dòng trên. `docker/dev-macos.sh` chạy cả 9 service Java thật với seed này.
- **php-fpm nghe 9001**, vì 9000 là login server (host network).
- **nginx rewrite lấy từ file gốc** `www/server/panel/vhost/rewrite/192.168.1.69.conf` (từ 2026-09-04; trước đó là suy đoán và thiếu `/user-*`, `/act-*` nên login web hỏng) — vẫn kiểm tra đăng nhập web ngay sau lần `up` đầu.
- Trước khi upload cây `server/` (phương án bind mount): xoá 19 file rác `%3F` trong `excel/release` (`tools/fix-filenames.ps1 -Apply -RemoveDuplicates`), đổi `192.168.1.69` trong `global.conf.json` + client JS + PHP (README mục 3). Các dòng `tcg.srv_cross.url` / `srv_group_device.url` / `cloud_device.host_WAN` trong DB do `zz-init.sh` tự sửa lúc khởi tạo, không cần sửa dump.
- Bộ này **đã `up` thật trên macOS 2026-09-05**: 19 container, 9 JVM, seed sạch nạp đủ 101 bảng (tcg 59 + stat 20 + web 21 + cdks 1), đăng ký → `/choi-game` → client tự đăng nhập bằng tài khoản game thật trên login server thật, RAM thực 2,3 GiB. **Chặn ở bước vào thế giới:** thiếu `website/game/template/` (`perLoadTpls.json`, `dongtaitishi.txt`) — không có trong git lẫn release `assets-v1`, phải lấy từ `/www/wwwroot/game/template` trên server cũ. 11 lỗi tìm được và cách vá: [docs/mac-test-brief.md](docs/mac-test-brief.md) mục 7.
- **`ADAPTER_PLATFORM_CODE` phải là `develop`.** Các mã khác làm login server trả `errorcode=0` nhưng `uid`/`token` đều `null` kèm `该登录方式目前不生效` — thành công giả, rất khó lần ra.
- **Build thẳng trên server:** `docker-compose.image.yml` có sẵn `build:` (chỉ ở `console`, `php`, `nginx`); `docker/server-bootstrap.sh` mặc định `MODE=build` — cài git+git-lfs, clone vào `/opt/tcg/src` (LFS 611 MB), `docker compose build`. Không cần GHCR/CI. `MODE=pull` để chỉ pull image.
- **Tài nguyên client `res/ sound/ spine/`** (1.6 GB) không nằm trong git/image: rsync thẳng từ server cũ (`/www/wwwroot/game/{res,sound,spine}`) vào `ASSETS_DIR=/opt/tcg/assets`; hoặc WinSCP; hoặc đính tar.gz vào GitHub Release (≤ 2 GB/file, không tính LFS). Xem docker/README.md mục 6c–6d.
- **Nền tảng Go `platform/`** (id :8080, adapter 127.0.0.1:8090, admin 127.0.0.1:8100) nằm sẵn trong `docker-compose.image.yml` (bản image) và `docker-compose.platform.yml` (bản có `build:`). Service one-shot `platform-seed` tạo DB MySQL `platform` và seed `oauth_clients/games/game_servers/game_devices/game_packages` — không có bước SQL tay; gói quy đổi sinh bằng `tools/gen-game-packages.py` → `docker/platform-seed/game_packages.haitac.sql`. Adapter cần `CONSOLE_ADMIN_PASSWORD` (tài khoản `admin` trong `tcg.staff`) để phát vật phẩm.
- **Phương án 2 — image từ GHCR:** `.github/workflows/build-images.yml` build `op-h5-server` (temurin 8 + `server/`), `op-h5-php`, `op-h5-nginx` (+ `website/game` trừ media) và `op-h5-id/adapter/admin` (từ `platform/`), push lên `ghcr.io/rickymta/`. Image không chứa secret: `docker/server-entrypoint.sh` và `docker/web-entrypoint.sh` điền placeholder + `PUBLIC_HOST` từ `.env` lúc start. Compose tương ứng: `docker/docker-compose.image.yml`; server mới: `docker/server-bootstrap.sh`. `res/ sound/ spine/` phải upload riêng vào `ASSETS_DIR` (không nằm trong git/image). LFS free 1 GB bandwidth/tháng — CI cache LFS, chỉ lần build đầu tốn 611 MB. Package GHCR mặc định private → đổi sang Public một lần.

---

## 16. Repo GitHub (public) và secrets

Cây này là git repo, `origin` = `https://github.com/rickymta/op-h5.git` (**public**, nhánh `main`).

- **Secrets đã bị che** bằng `tools/mask-secrets.py --mask`: mọi mật khẩu/API key trong 27 file thành `__PLACEHOLDER__` (danh sách ở [SECRETS.md](SECRETS.md)). Bản thật nằm ở `_backup-secrets-original/` — gitignored. **Cây local không chạy được** cho tới khi `python tools/mask-secrets.py --fill secrets.env` (file `secrets.env` cũng gitignored).
- **Trước mọi commit**: `python tools/mask-secrets.py --check` phải in `sach` (từ 2026-09-05 quét cả `docker/initdb/mysql/seed/*.sql`). Không commit `secrets.env`, `docker/.env`, dump thật `docker/initdb/mysql/*.sql` + `docker/initdb/mongo/dump/`, `.logs/`, keystore. Riêng `docker/initdb/mysql/seed/` **có** trong git — sinh lại bằng `python tools/dump-to-seed.py` (tool từ chối ghi nếu còn giá trị thật).
- `--check` làm **hai** phép: (1) giá trị gốc có quay lại cây không — so với `_backup-secrets-original/`; (2) mọi file trong `RULES` có **còn** placeholder không. Phép (2) thêm 2026-09-05 vì phép (1) mù với giá trị *mới sinh*: `web-entrypoint.sh` của container php sed thẳng vào bind mount, nên chạy `docker/dev-macos.sh` xong là `api/config.php`, `new/config.php`, `user/index.php`, `user/indexapk.php`… mang mật khẩu MySQL sống — mà `--check` cũ vẫn in `sach`.
- **Đang chạy dev thì `--check` sẽ báo `DA DIEN`.** Đó là đúng. Trước khi commit: dừng `op-php` rồi `git checkout -- website/game/`.
- **Không nằm trong git**: `website/game/res|sound|spine` (1.6 GB), `home.zip`, backup `_backup-*/`, `excel-staging/`, `build/`, 19 file rác `%3F`. Chuyển bằng WinSCP.
- **8 fat JAR qua Git LFS** (`.gitattributes`); `tcg-game.jar` và `game/lib/*.jar` ở git thường. Clone cần `git lfs install`.
- Thứ tự khi deploy bằng image (khuyến nghị): trên server `server-bootstrap.sh` với `PUBLIC_HOST=<ip>` — tự `gen-env.sh`, pull/build, `up -d`; không cần secrets cũ. Phương án bind mount cây `server/`: `--fill secrets.env` → `tools/set-server-host.py <ip> --apply` → upload. Đừng commit sau khi fill (check sẽ báo).
