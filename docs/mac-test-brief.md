# Giao việc: chạy thử toàn bộ hệ thống trên macOS với bộ seed sạch

Tài liệu này viết cho một phiên Claude Code chạy trên máy macOS có Docker Desktop. Đọc hết trước khi làm. Mọi thứ cần biết nằm ở đây, [CLAUDE.md](../CLAUDE.md) (mục 15–16) và [docker/README.md](../docker/README.md).

## 0. ĐỢT 2 (2026-09-05 đêm) — retest tạo nhân vật + kiểm các bản vá mới. LÀM PHẦN NÀY TRƯỚC

Đợt 1 (mục 7) dừng ở bước **tạo nhân vật**: lỗi `channelCode` không phải số đã vá (mục 7, lỗi 12) nhưng
**chưa chạy lại để xác nhận**. Sau đó phiên trên PC Windows commit `77054c6` vá thêm 7 chỗ cho server
thật; trong đó ba thứ chạy được trên Mac: `dev-macos.sh` truyền tài khoản GM cho php, seed sinh lại với
`ROW_FORMAT=DYNAMIC` (không còn dựa vào `sed` trong `zz-init.sh`), và `game.conf` có thêm location ACME.
Phần còn lại (`enable-domain.sh`, compose cho server, heap trong `.env.example`) chỉ đọc, không chạy được ở đây.

### 0.1 Chuẩn bị

```bash
git pull && git lfs pull                       # phải thấy 77054c6 trong git log
./docker/dev-macos.sh --down && ./docker/dev-macos.sh     # không cần --build: image không đổi; seed/dev-macos được chép lại mỗi lần chạy
```

Mở client bằng **cửa sổ ẩn danh** hoặc xoá cache trước — lỗi 10 (bundle cache 30 ngày) từng làm một tab "kẹt" vì tài nguyên cũ.

Các lệnh dưới dùng `$M` như mục 5: `M=docker exec op-mysql mysql -uroot -p"$(grep ^MYSQL_ROOT_PASSWORD= docker/.dev-macos/creds.txt | cut -d= -f2-)"`.

### 0.2 Tạo nhân vật — điểm chặn của đợt 1

1. `http://127.0.0.1:8081` đăng ký tài khoản mới → `http://127.0.0.1:8080/may-chu` → `/choi-game`.
2. Client qua màn hình tải (không được đứng ở "Đang tải cấu hình giao diện… 0%"), bấm CHIẾN GAME, đặt tên, tạo nhân vật, vào được thế giới (thấy nhân vật/thành).
3. Bằng chứng phía server, ghi vào mục 7:

```bash
docker exec op-game grep -cE 'NumberFormatException|创建主角失败' .logs/game-s1/error.log        # 0
docker exec op-game grep -E '角色登录请求|创建主角' .logs/game-s1/info.log | tail -5                # có dòng tạo/đăng nhập nhân vật
$M -N -e "SELECT username, platform_code, channel_code FROM tcg.account"                        # channel_code = 0, platform_code = develop
$M -N -e "SELECT account_uid, srv_code, master_name, master_level FROM tcg.account_master"      # 1 dòng, tên vừa đặt
docker exec op-mongo mongo -u abc123 -p "$(grep ^MONGO_PASSWORD= docker/.dev-macos/creds.txt | cut -d= -f2-)" --authenticationDatabase admin --quiet game-s1 --eval 'db.master.countDocuments({})'   # 1
```

Hỏng ở đâu thì log quyết định: `docker exec op-game tail -50 .logs/game-s1/error.log` và `docker logs op-adapter | tail -30`. Tạo nhân vật hỏng mà error.log không có gì → xem `docker exec op-login tail -30 .logs/info.log`.

4. Thoát rồi vào lại `/choi-game`: phải vào **thẳng nhân vật vừa tạo**, không qua màn hình chọn máy chủ (Adapter đăng nhập hộ + `masterList`).

### 0.3 GM tool với tài khoản có mật khẩu băm (mới ở đợt này)

`dev-macos.sh` giờ in dòng `GM tool http://127.0.0.1:8080/adminportal: gm / <mật khẩu>` (cũng có trong `docker/.dev-macos/creds.txt`, khoá `GM_BOOTSTRAP_PASSWORD`).

1. `http://127.0.0.1:8080/adminportal` → form đăng nhập; sai mật khẩu bị từ chối; đúng thì vào.
2. Chưa đăng nhập mà mở thẳng `/gmhanglong/gm/index.php` → 302 về login; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/gmhanglong/gm/api.php` → 401.
3. `$M -N -e "SELECT username, role, LENGTH(password_hash), status FROM platform.gm_users; SELECT action, COUNT(*) FROM platform.gm_audit GROUP BY action"` → 1 dòng `gm`, hash 60 ký tự; audit có `login_failed` và đăng nhập thành công.
4. Một thao tác GM **an toàn** để chứng minh đường console: gửi thư kèm 1 vật phẩm nhỏ **cho đúng nhân vật vừa tạo** (không gửi toàn server), rồi vào game mở hòm thư. Kết quả ghi vào mục 7.
5. `docker logs op-php 2>&1 | grep 'php-fpm env'` → `10 bien` (4 biến ví ID + 4 `ID_DB_*` + 2 `GM_BOOTSTRAP_*`); ít hơn là `dev-macos.sh` chưa truyền đủ.

### 0.4 Kiểm nhanh các bản vá còn lại

```bash
# `ERROR` khop ca chuoi ERROR_FOR_DIVISION_BY_ZERO trong mot dong Warning vo hai cua MySQL 8
# (dem ra 3 chu khong phai 0). Chi can bat loi that:
docker logs op-mysql 2>&1 | grep -cE 'Row size too large|\[ERROR\]'                             # 0 — seed đã DYNAMIC tại nguồn
$M -N -e "SELECT table_name, row_format FROM information_schema.tables WHERE table_schema='web' AND table_name='card_log'"   # Dynamic
docker inspect -f '{{.State.Status}} {{.State.OOMKilled}}' op-group op-cross                     # running false ×2 (heap 1152m)
docker exec op-group grep -ciE 'OutOfMemory|GC overhead' .logs/group-group-offical/info.log      # 0
curl -s -o /dev/null -w '%{http_code}
' http://127.0.0.1:8080/.well-known/acme-challenge/x      # 404 (location ACME có, thư mục trống) — KHÔNG được 500
# QUET CA dev-macos.sh: loi 14 la mot SC2215 ma dong lenh cu (thieu file nay) khong thay.
# Khong co shellcheck tren may thi chay qua docker — dung ban stable, khong can cai gi.
docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:stable -S warning \
  docker/enable-domain.sh docker/server-bootstrap.sh docker/gen-env.sh docker/dev-macos.sh
awk 'p ~ /\\$/ && /^[[:space:]]*#/ {print FILENAME":"FNR; n++} {p=$0} END{print "comment giua dong noi:", n+0}' \
  $(find . -name '*.sh' -not -path './.git/*' -not -path './_backup*')
```

Đọc `docker/enable-domain.sh` một lượt với con mắt "sẽ chạy trên Ubuntu bằng root": thấy chỗ nào sai
logic (thứ tự, biến chưa đặt, lệnh không có trên Ubuntu 22.04) thì sửa và ghi vào mục 7. Không chạy nó ở đây.

### 0.5 Báo cáo và cập nhật

- Điền các dòng **5.5b**, **5.7**, **5.8** trong bảng mục 7 (đã chèn sẵn), thêm mục lỗi mới (đánh số tiếp từ 13) nếu có.
- Nếu 0.2 qua: sửa `docker/README.md` mục 7 dòng 3 (bỏ "Còn chặn ở bước vào thế giới…") và `CLAUDE.md` mục 15 dòng "đã `up` thật trên macOS" thành "vào được thế giới, tạo được nhân vật".
- Làm đúng mục 8 trước khi commit. Không push.

---

## 1. Mục tiêu

Kiểm chứng lần đầu rằng cụm game lên được **từ số không, không cần dump server cũ**, bằng đúng đường mà server thật sẽ đi:

1. MySQL khởi tạo từ seed sạch `docker/initdb/mysql/seed/` qua `docker/initdb/mysql/zz-init.sh`.
2. Chín service Java thật khởi động theo thứ tự console → world → meta → statistic → pay → group → game s1 → login → cross.
3. Nền tảng ID / Adapter / trang quản trị lên, `platform-seed.sh` đọc được máy chủ từ `tcg.srv_game`.
4. Đăng ký tài khoản mới, vào `/choi-game`, client nạp được, nối WebSocket `:8001`, tạo được nhân vật.

Kết quả mong đợi cuối phiên: mục 7 của tài liệu này được điền, các chỗ "chưa kiểm chứng" trong `docker/README.md` mục 7 và `CLAUDE.md` mục 15 được cập nhật theo sự thật đo được, và một commit.

## 2. Bối cảnh — cái gì mới, cái gì chưa từng chạy

Commit "docker: seed MySQL sạch trong git…" (2026-09-05) thêm:

| File | Vai trò |
|---|---|
| `tools/dump-to-seed.py` | Sinh seed từ dump thật (dump chỉ có trên PC Windows, gitignored). **Trên Mac không chạy được tool này** vì không có dump. |
| `docker/initdb/mysql/seed/{00-tcg,stat,web,cdks}.sql` | Schema đủ 4 DB + dữ liệu ~23 bảng cấu hình, mật khẩu là placeholder `__X__`. |
| `docker/initdb/mysql/zz-init.sh` | Image mysql `source` file này ở lần khởi tạo đầu: nạp seed, rồi `UPDATE` mật khẩu/host từ biến môi trường vào `tcg.cloud_*`, `staff`, `cloud_device`, `srv_login`, `srv_cross`, `srv_group_device`, `srv_game_access`; thêm máy chủ theo `GAME_SERVERS`. |
| `docker/gen-env.sh`, `docker/server-bootstrap.sh` | Cho server thật, không dùng trên Mac. |
| `docker/dev-macos.sh` | **Viết lại**: chạy cả 9 JVM thật, bỏ login giả và console giả. Đây là script bạn sẽ chạy. |

**Chưa từng chạy thật, chỉ mô phỏng:** `zz-init.sh` mới được test bằng hàm `docker_process_sql` giả ở ba nhánh (seed / dump / thiếu biến). Chưa ai thấy nó chạy trong container MySQL thật. Adapter chưa từng nói chuyện với login server thật (trước đây chỉ có `cmd/fakelogin`). Schema từ mysqldump 5.6 chưa từng import vào MySQL 8. Đó là ba điểm có xác suất hỏng cao nhất.

Những quyết định đã cố ý làm, đừng "sửa lại":

- `srv_game_access` tắt mọi giới hạn (`platform_limit=0`…). Login (`GameAccessHandler$Sorter`) chỉ hiện máy chủ có dòng access khớp; Adapter gọi `/srv/game/list` không kèm `platformCode`, nên dòng gốc `platform_code='develop'` sẽ ẩn hết máy chủ.
- `srv_cross.url`, `srv_group_device.url` = `http://127.0.0.1:<port>/` vì mọi tiến trình cùng máy.
- `srv_game.open_time = CURDATE()` lúc import; `app.game_key/secret_key` sinh ngẫu nhiên bằng SQL (không nơi nào ngoài server dùng chúng).
- Không có tài khoản nào trong seed. Phải đăng ký mới.

## 3. Chuẩn bị (một lần)

```bash
cd <repo> && git pull && git lfs pull          # 8 fat JAR qua LFS; JAR ~60–110 MB, không phải 130 byte
ls -la server/statistic/*.jar                  # ~104 MB
```

Docker Desktop: cấp **ít nhất 8 GB RAM, nên 10 GB** (9 JVM tổng heap ~5 GB). Xem Settings → Resources.

Tài nguyên client (1.6 GB, không có trong git). Client hiện màn trắng nếu thiếu:

```bash
ls website/game/res 2>/dev/null | wc -l        # phải ~10584; nếu 0 thì tải:
curl -L https://github.com/rickymta/op-h5/releases/download/assets-v1/client-assets.tar.gz -o /tmp/client-assets.tar.gz
curl -L https://github.com/rickymta/op-h5/releases/download/assets-v1/client-assets.tar.gz.sha256 -o /tmp/client-assets.tar.gz.sha256
(cd /tmp && shasum -a 256 -c client-assets.tar.gz.sha256)
tar -xzf /tmp/client-assets.tar.gz -C website/game     # tạo res/ sound/ spine/ (đã gitignore)
```

## 4. Chạy

```bash
./docker/dev-macos.sh --build      # lần đầu: build 5 image (Go compile ~3 phút, server COPY 0.8 GB), rồi chạy
./docker/dev-macos.sh              # các lần sau
./docker/dev-macos.sh --down       # tắt và xoá hết
```

Mỗi lần chạy là một môi trường **mới**: mật khẩu sinh mới, DB tạo mới, tài khoản cũ mất. Script tự đợi từng cổng (game tới 300 s), tổng 5–8 phút. Nó in bảng trạng thái, các URL và mật khẩu; bản đầy đủ ở `docker/.dev-macos/creds.txt` (gitignored). **Không chép mật khẩu vào báo cáo hay commit.**

Cổng trên Mac: `8080` trang game, `8081` hệ thống ID, `8100` quản trị, `8025` hộp thư, `9000` login, `9999` console, `8001` WebSocket s1, `12345` meta, `7788` statistic.

## 5. Điểm kiểm tra — làm đủ, ghi kết quả vào mục 7

Ký hiệu `M=docker exec op-mysql mysql -uroot -p"$(grep ^MYSQL_ROOT_PASSWORD= docker/.dev-macos/creds.txt | cut -d= -f2-)"`.

**5.1 zz-init.sh** (điểm quan trọng nhất):

```bash
docker logs op-mysql 2>&1 | grep -E 'tcg-init|ERROR' 
```
Phải thấy `seed: 00-tcg.sql … cdks … stat … web`, `xong (seed)`, dòng `s1  ws=8001  device=d1  open=<hôm nay>`. Không có dòng `ERROR` của mysqld giữa chừng. Rồi:

```bash
$M -N -e "SELECT code, ws_port, device_code, mongo_code, mysql_code, cross_code, group_id FROM tcg.srv_game;
SELECT code, conf_host, conf_username, conf_password LIKE '\\_\\_%' AS con_placeholder FROM tcg.cloud_mysql;
SELECT code, conf_username, conf_password LIKE '\\_\\_%' FROM tcg.cloud_mongo;
SELECT code, conf_username, conf_password LIKE '\\_\\_%' FROM tcg.cloud_mq;
SELECT code, host_WAN, host_LAN FROM tcg.cloud_device;
SELECT code, url FROM tcg.srv_cross; SELECT code, url FROM tcg.srv_group_device;
SELECT srv_code, mode, platform_limit, game_id_limit FROM tcg.srv_game_access;
SELECT username, password LIKE '\\_\\_%' FROM tcg.staff;
SELECT game_id, LENGTH(game_key), LENGTH(secret_key) FROM tcg.app;
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema IN ('tcg','stat','web','cdks');"
```
Mong đợi: mọi cột `LIKE '__%'` = 0; `host_WAN` của `d1` = `127.0.0.1`; hai `url` = `http://127.0.0.1:20001/` và `:30001/`; `mode=1, platform_limit=0, game_id_limit=0`; hai `LENGTH` = 32; tổng bảng = 101 (59+20+21+1). **Không `SELECT` cột mật khẩu ra màn hình.**

**5.2 Từng JVM lên và cấu hình resolve đúng:**

```bash
for c in console world meta statistic pay group game login cross; do printf '%-10s %s\n' $c "$(docker inspect -f '{{.State.Status}}' op-$c)"; done
docker exec op-game     grep -m1 '游戏启动配置' .logs/game-s1/info.log | sed -E 's/(password|sshPassword)=[^,)]*/\1=***/g'
docker exec op-game     grep -m1 'Spring 启动完毕' .logs/game-s1/info.log
docker exec op-cross    grep -m1 -E '启动完毕|Started' .logs/cross-cross-yzx1/info.log
docker exec op-group    grep -m1 -E '启动完毕|Started' .logs/group-group-offical/info.log
docker exec op-login    grep -m1 'Started' .logs/info.log
```
Dòng `GameLoading(` phải có `wsPort=8001`, `mongo … host='127.0.0.1'`, `mysql … host=127.0.0.1`, `cross … url=http://127.0.0.1:20001/`, `group … url=http://127.0.0.1:30001/`, `dynamic … 3 entries`. Trước khi cross lên, game có thể log `Connect to 127.0.0.1:20001 failed` — bình thường, tự hết.

**5.3 Không có lỗi cấu hình:**

```bash
docker exec op-game  grep -cE '找不到excel|找不到sheet|加载错误' .logs/game-s1/info.log     # 0
docker exec op-world grep -cE 'NullPointerException|加载错误' .logs/info.log                 # ghi số; world từng NPE ở sheet 皮肤激活道具 (CLAUDE.md 11.3)
docker exec op-group grep -ciE 'OutOfMemory|GC overhead' .logs/group-group-offical/info.log # 0
for c in console world meta statistic pay group game login cross; do echo "== $c"; docker exec op-$c sh -c 'cat .logs/error.log .logs/*/error.log 2>/dev/null | grep -vE "^\s" | tail -5'; done
```
Bảng `stat` rỗng nên statistic có thể báo lỗi khi tổng hợp — ghi lại nguyên văn nhưng không phải lỗi chặn. `game_s1` phải tự xuất hiện: `$M -N -e "SHOW DATABASES LIKE 'game_s1'; SHOW TABLES FROM game_s1;"` → 4 bảng `stat_*`.

**5.4 HTTP:**

```bash
curl -s -o /dev/null -w 'console %{http_code}\n' http://127.0.0.1:9999/conf/global/get
curl -s http://127.0.0.1:9000/srv/game/list | head -c 400; echo          # phải có s1 (mảng không rỗng)
curl -s http://127.0.0.1:12345/announce/one | head -c 200; echo
curl -sI http://127.0.0.1:8080/ | head -1;  curl -sI http://127.0.0.1:8080/play.php | head -1
curl -s http://127.0.0.1:8081/.well-known/openid-configuration | head -c 150; echo
docker logs op-php 2>&1 | grep -E 'web-entrypoint' | tail -3                  # "da dien het" hoặc liệt kê placeholder còn lại (nạp thẻ/MoMo — chấp nhận)
```
`/srv/game/list` **rỗng** = giới hạn access chưa tắt hoặc login chưa thấy game heartbeat; xem `docker exec op-login cat .logs/info.log | tail -50`.

**5.5 Luồng người chơi** (dùng trình duyệt tích hợp nếu có, không thì hướng dẫn người dùng làm tay):

1. `http://127.0.0.1:8081` → đăng ký tài khoản (email giả, thư xác nhận ở `http://127.0.0.1:8025`).
2. `http://127.0.0.1:8080` → `/may-chu` thấy s1 → `/choi-game`.
3. Client nạp (thanh loading), **không** hiện màn hình đăng nhập cũ (Adapter đăng nhập hộ, `window.__opAuto`), vào tạo nhân vật. F12 → Network: WebSocket tới `127.0.0.1:8001`, không gọi `192.168.1.69`.
4. Kiểm tra phía server: `docker exec op-adapter …` không cần; xem `docker logs op-adapter | tail -20` không có `K_PASSWORD_ERROR`, `docker exec op-login tail -20 .logs/info.log` có dòng đăng nhập, `$M -N -e "SELECT COUNT(*) FROM tcg.account"` = 1.
5. Nếu có thời gian: `/quy-doi` mua một gói → Adapter gọi console `/gm/pay/manual` → xem `docker logs op-adapter` và thư trong game.

**5.6 platform-seed:** trong output của `dev-macos.sh` bước 7/8, sáu dòng đếm `oauth_clients=1, games=1, game_devices=1, game_servers=1, game_packages=1962, admin_users=1`.

## 6. Khi hỏng — cách lần và được phép sửa gì

- **MySQL không lên / init lỗi**: `docker logs op-mysql`. Nếu là lỗi SQL trong seed (ví dụ MySQL 8 từ chối một `CREATE TABLE` của mysqldump 5.6): ghi nguyên văn dòng lỗi + tên bảng vào mục 7. Được phép sửa **`zz-init.sh`** (ví dụ thêm `SET sql_mode` trước khi nạp) và commit. **Không sửa tay file trong `seed/`** — chúng do tool sinh; nếu bắt buộc phải đổi nội dung seed, sửa quy tắc trong `tools/dump-to-seed.py` (hàm `KEEP`, `transform`) và ghi rõ trong mục 7 rằng seed cần sinh lại trên PC (chỉ PC có dump).
- **Một JVM không lên trong thời hạn**: `docker logs op-<tên>` (stdout) và log logback trong container (đường dẫn ở 5.2). Từ khoá: `配置` cấu hình, `找不到` không tìm thấy, `加载错误` lỗi nạp. Heap thiếu → sửa số `-Xmx` trong `java_svc` của `dev-macos.sh`.
- **Cross/group/game không thấy nhau**: so `url`/`port` trong `tcg.srv_cross`, `srv_group_device` với `--p=` của lệnh chạy trong `dev-macos.sh` (20001, 30001).
- **Client hiện màn hình đăng nhập cũ**: Adapter từ chối; xem `window.__opAutoErr` trong console trình duyệt và `docker logs op-adapter`.
- Cần chạy lại từ đầu: `./docker/dev-macos.sh --down && ./docker/dev-macos.sh`.

Được phép sửa và commit: `docker/dev-macos.sh`, `docker/initdb/mysql/zz-init.sh`, `docker/nginx/*`, `platform/`, tài liệu. Phải hỏi người dùng trước khi: đổi JAR, đổi Excel, sửa `tools/dump-to-seed.py` theo hướng giữ thêm dữ liệu từ dump, hay push.

## 7. Kết quả (Claude trên Mac điền)

Điền bảng này, thay từng ô bằng ✅ / ❌ kèm một dòng bằng chứng (số đếm, dòng log đã che mật khẩu). Rồi cập nhật `docker/README.md` mục 7 (bỏ mục 5 "zz-init.sh chưa chạy trong container MySQL thật" nếu đã qua; sửa mục 3) và `CLAUDE.md` mục 15 dòng "Bộ này chưa từng được `up` thật".

| # | Điểm kiểm tra | Kết quả | Bằng chứng |
|---|---|---|---|
| 5.1 | zz-init.sh nạp seed, không còn placeholder, 101 bảng | ✅ *(sau 3 bản vá)* | `xong (seed)` + `s1 ws=8001 device=d1 open=2026-09-05`; 6/6 nhóm placeholder = 0; tcg 59 + stat 20 + web 21 + cdks 1 = **101** |
| 5.2 | 9 JVM `running`, `GameLoading` đúng host/port | ✅ | cả 9 `running`; `wsPort=8001`, mongo/mysql `host=127.0.0.1`, cross `url=http://127.0.0.1:20001/`, group `:30001/` |
| 5.3 | game không thiếu Excel; group không OOM; `game_s1` tự tạo | ⚠️ | group OOM = 0 ✅; `game_s1` có đủ 4 bảng `stat_*` ✅; game còn **9** dòng thiếu excel — 5 file `bt-*` (không cần, `gameVer=mainland`, CLAUDE.md 11.4) + 4 `加载错误`; world **1** NPE (đã biết, CLAUDE.md 11.3) |
| 5.4 | console 200, `/srv/game/list` có s1, web 200, OIDC JSON | ✅ | console `200`; `/srv/game/list` → `[{"code":"s1",...}]`; `/` và `/play.php` `200`; OIDC discovery trả JSON |
| 5.5 | đăng ký → `/choi-game` → WebSocket 8001 → tạo nhân vật | ⚠️ *(vào được, tạo nhân vật cần retest)* | Đăng ký ✅, `/may-chu` hiện s1 ✅, `/choi-game` → client vào thẳng màn hình chọn máy chủ **không qua form đăng nhập cũ** ✅, tài khoản game thật `id000000001` trong `tcg.account` ✅, `ws://127.0.0.1:8001/game` ✅. Nhưng bấm CHIẾN GAME thì client đứng ở "Đang tải cấu hình giao diện… 0%", **không mở WebSocket nào**; `角色登录请求 total=0`. Thiếu `website/game/template/` (đã tái tạo, mục 11). Sau đó tạo nhân vật hỏng vì `channelCode` không phải số (mục 12) — đã vá, **cần chạy lại để xác nhận** |
| 5.6 | platform-seed 6 dòng đếm | ✅ | `oauth_clients 1, games 1, game_devices 1, game_servers 1, game_packages 1962`; `admin_users 1` do service `admin` tự tạo (không phải platform-seed) |
| 5.5b | **Đợt 2:** tạo nhân vật → vào thế giới; vào lại đi thẳng nhân vật | | |
| 5.7 | **Đợt 2:** GM tool `/adminportal` đăng nhập bằng `gm_users`; api.php 401; gửi thư 1 nhân vật nhận được | ⏳ *(chờ bước trình duyệt)* | Đã đo phần không cần đăng nhập: `/adminportal` → **302** → `/gmhanglong/login.php?next=%2Fadminportal` → **200**, đúng form "Công cụ GM"; `/gmhanglong/gm/index.php` → **302** về login; `/gm/index.php` → **302** (chốt chặn đã ở đầu file); `/gmhanglong/gm/api.php` → **401**; sai mật khẩu bị từ chối bằng thông báo chung và ghi `login_failed` vào `gm_audit`; `gm_users` = 1 dòng `gm`/`owner`/hash **60** ký tự/`active`; `php-fpm env: 10 bien`. **Còn lại:** đăng nhập đúng + gửi thư — cần người dùng nhập mật khẩu |
| 5.8 | **Đợt 2:** seed DYNAMIC không lỗi; group/cross không OOM ở 1152m; ACME 404; enable-domain.sh đọc soát | ✅ | `Row size too large` **0**, `[ERROR]` **0** (dòng lệnh cũ đếm 3 là dương tính giả — xem 0.4); `web.card_log` = **Dynamic** tại nguồn, `zz-init.sh` không phải sed nữa; `op-group`/`op-cross` `running`, `OOMKilled=false`, `OutOfMemory` **0**; `/.well-known/acme-challenge/x` → **404**; `enable-domain.sh` đọc soát ra **lỗi 13** (đã sửa), shellcheck 4 script sạch |
| — | RAM thật | ✅ | **2,3 GiB / 7,75 GiB** lúc 13 container chạy (game 1,21 GiB, group 1,25 GiB lớn nhất). Trần heap 6016m chỉ là mức đặt trước |
| — | Thời gian tới khi login lên | ✅ | ~2 phút: console → world (5s) → statistic (10s) → pay (5s) → group (25s) → game (30s) → login (5s) → cross |

**RAM Docker Desktop trên máy này là 7,8 GB**, dưới mức 8 GB tài liệu yêu cầu. Không gây sự cố (thực dùng 2,3 GiB) nhưng nên nâng lên 10 GB như khuyến nghị.

### Lỗi gặp và cách xử lý

**1. `zz-init.sh` không chạy được trên macOS — MySQL chết mã 126.**
`/bin/bash: bad interpreter: Permission denied`. File trên đĩa là `0644`, nhưng bind mount của Docker Desktop trình diện mọi file là `0777` trong container nên entrypoint chọn nhánh *chạy* thay vì *source* — rồi chính mount đó lại `noexec`. Sửa ở `dev-macos.sh`: `docker create` + `docker cp` + `docker start`. Linux giữ đúng mode nên không dính.

**2. `set -u` lọt vào hàm của image.**
`docker_process_sql` đọc `"$1"` khi được gọi không tham số (dòng 249 `docker-entrypoint.sh`, mysql:8.0) và đọc `$MYSQL_DATABASE` có thể chưa đặt. Hàm của image không an toàn với `-u`. Sửa ở `zz-init.sh`: tắt `-u` đúng lúc gọi, bật lại ngay.

**3a. `ROW_FORMAT=COMPACT` từ mysqldump 5.6 vượt giới hạn dòng của MySQL 8.**
`ERROR 1118 (42000) at line 69: Row size too large (> 8126)` khi tạo `web.card_log` (10 cột `varchar(255)` utf8mb4). Sửa ở `zz-init.sh`: `sed ROW_FORMAT=COMPACT -> DYNAMIC` lúc nạp seed.
**Đã làm trên PC (2026-09-05 tối):** `tools/dump-to-seed.py` phát `DYNAMIC` tại nguồn (seed sinh lại, 100 bảng), `prepare-dumps.sh` sed dump thật ngay trên server cũ — vì image mysql nạp dump trực tiếp (sắp xếp trước `zz-init.sh`) nên bản vá trong `zz-init.sh` không chen vào được với dump.

**3b. `set -e` trong `zz-init.sh` vô hiệu — lỗi bị nuốt.**
Nặng hơn 3a. `_tcg_init` được gọi dạng `_tcg_init || { ... }`; trong danh sách `||` thì `set -e` bị tắt cho cả compound command và mọi lệnh con. Kết quả: `web.sql` chết ở bảng thứ 3 nhưng script vẫn in **`xong (seed)`** và hệ thống lên với **2/21 bảng `web`**. Sửa: kiểm tra mã thoát tường minh sau mỗi lần nạp.

**4. `group` và `cross` OOM ở 640m.**
`Terminating due to java.lang.OutOfMemoryError: Java heap space`. Cả hai đều có `jvmArgs=-Xms128m -Xmx1128m` trong DB (`SrvGroupDeviceEntity` / `SrvCrossEntity`) — đúng CLAUDE.md 11.2. Nâng cả hai lên 1152m.

**5. `LoginClient` gửi form-urlencoded, login server thật chỉ nhận JSON.**
`Content type 'application/x-www-form-urlencoded;charset=UTF-8' not supported`. Khuôn cũ suy ra từ `cmd/fakelogin` (nhận cả hai) nên sai chỉ lộ khi chạy JAR thật. Sửa: thêm `postJSON`, dùng cho `/account/register` và `/account/login`.

**6. `platformCode` phải là `develop`.**
Với các mã khác (`id`, `yezixi`, `official`, `web`) login server trả `errorcode=0` nhưng `uid`/`token` đều `null` kèm ghi chú `该登录方式目前不生效` — **thành công giả**. Chỉ `develop` bật nhánh username+mật khẩu (`使用了用户名和密码的方式`). Khớp với dòng gốc `srv_game_access.platform_code='develop'`. Đã đổi mặc định ở `main.go`, `.env.example`, compose, `dev-macos.sh`.

**7. Khoá game Adapter sinh dài hơn cột.**
`Data truncation: Data too long for column 'password'` — `tcg.account.password` là `varchar(32)` còn khoá là 43 ký tự (base64url của 32 byte). Sửa: sinh 24 byte = đúng 32 ký tự, kèm test khoá ràng buộc.

**8. `NetProcess.WebSocketURL` bỏ mất đường dẫn.**
Login server thật trả `path: "game"` → URL đúng là `ws://host:8001/game`. Bản giả lập không có trường này nên lỗi bị giấu. Đã thêm `Path` + test.

**9. Khoá game bị lộ xuống trình duyệt.**
Login server thật trả **khoá dạng thô** trong `data.account.password`, mà `play.php` nhúng `login_data` thẳng vào trang. Đã thêm `redactLoginData`.
**Phải nói rõ:** việc này *không* làm cho khoá "không bao giờ xuống trình duyệt" — chính JWT trong `data.token` mang khoá đó ở claim `a4` (đã giải mã đối chiếu), mà client bắt buộc phải có token. Với login server này, khoá game của một người chơi **sẽ** đến trình duyệt của chính họ; không sửa được ở phía ta. Cái lớp Adapter vẫn giữ được: mật khẩu hệ thống ID không bao giờ đến cụm game, và mỗi người chỉ thấy khoá của mình. Đã sửa lại các chỗ tài liệu khẳng định sai.

**10. Cache bundle giữ host cũ tới 30 ngày.**
nginx phục vụ `/libs/` với `immutable, 30d` còn `?v=` là `appVersion` cố định (28.3). Đổi `PUBLIC_HOST` thì `web-entrypoint` sed host mới vào bundle nhưng URL không đổi → trình duyệt giữ bản cũ. Đã dính thật: client tiếp tục gọi `192.168.1.69:7788` từ cache. Sửa: `play.php` phát `opBundleV` theo `filemtime`, `a3b31` gắn `&b=`, và `a3b31` cũng được gắn `?v=filemtime`.

**11. ~~Thiếu `website/game/template/`~~ — CHẨN ĐOÁN SAI, thư mục này không cần.**

Tôi thấy `/template/perLoadTpls.json` trả 404 lúc client đứng ở "Đang tải cấu hình giao
diện… 0%" và kết luận thư mục bị thiếu khỏi snapshot. Sai.

Client **không** tải theo đường dẫn đó. Toàn bộ tài nguyên đi qua bảng ánh xạ
`libs/2af72-f100c-2af72.json` (JSON nén deflate) dạng *tên logic → file băm trong `res/`*:

```
"template/perLoadTpls.json" -> "res/3b337-4248f-7ce3e"   (8038 byte, co san)
"template/dongtaitishi.txt" -> "res/2d19b-aaed7-3bd8b"   (593 byte,  co san)
"template/templates.bin"    -> "res/97cec-62c2f-5f56f"   (1,94 MB,   co san)
```

Kiểm chứng: bỏ hẳn thư mục rồi chạy lại — client vẫn vào tới màn hình chọn máy chủ, và
`performance.getEntriesByType('resource')` **không có lời gọi nào** tới `/template/`.
Thư mục đã xoá, không commit.

Hai điều rút ra:
- Bản tái tạo `perLoadTpls.json = []` của tôi là **sai nội dung** (bản thật 8038 byte
  chứa cấu hình), và `dongtaitishi.txt` tôi chép từ `server/excel/release/` cũng **khác**
  bản thật. Nếu commit thì chúng sẽ che mất bản đúng.
- Cái thật sự gỡ được luồng là các bản vá khác (JSON cho login server, `channelCode`,
  cache-bust bundle) chứ không phải thư mục này. Trùng thời điểm nên tôi quy nhầm nhân quả.

`common/`, `atlas/`, `grid/`, `herocut/` cũng vậy — tên logic trong manifest, không phải
thư mục trên đĩa.

**CÒN THIẾU THẬT:** 21 file băm trong `res/` và 1 file `sound/` mà manifest có trỏ tới
nhưng không tồn tại. Danh sách và cách xử lý: [windows-assets-handoff.md](windows-assets-handoff.md).

**12. `channelCode` phải là SỐ — tạo nhân vật thất bại.**
Đăng nhập vào được nhưng tạo nhân vật hỏng, và client không nói gì rõ ràng; lỗi chỉ nằm
trong `game/.logs/game-s1/error.log`:

```
CreateReq Line:78 - 创建主角失败:
java.lang.NumberFormatException: For input string: "web"
  at com.ososx.tcg.game.chat.ChatRule.exe_v2(ChatRule.java:146)
  at com.ososx.tcg.game.master.po.ProfilePO.nameCheck(ProfilePO.java:167)
  at com.ososx.tcg.game.master.MasterHolder.create(MasterHolder.java:229)
```

`"web"` chính là `ADAPTER_CHANNEL_CODE`. Bước kiểm duyệt tên nhân vật parse `channelCode`
thành int (`ChatRule` có cặp trường `channelid` / `channelCode`). Đổi mặc định sang `0`
ở `main.go`, `.env.example`, hai compose và `dev-macos.sh`.

`0` = kênh trực tiếp, là suy luận chứ không phải giá trị lấy từ nhà phát hành — nếu có mã
kênh riêng thì điền số đó. Cột `tcg.account.channel_code` là `varchar(32)` nên DB không
chặn, chỉ mã game mới đòi số.

**13. `enable-domain.sh` chết lặng khi thiếu một khoá trong `.env`.**
Chỉ đọc mã, chưa chạy (script dành cho Ubuntu/root). `envget` lấy giá trị bằng
`grep "^$1=" .env | ...`. Với `set -o pipefail`, `grep` không khớp trả 1 → cả pipeline trả 1
→ `V=$(envget X)` làm `set -e` thoát **ngay**, không in gì. Đã dính thật: `ACME_DIR` không có
trong `.env.example` lẫn `gen-env.sh`, nên trên máy sạch script sẽ chết trước cả khi in được
"bước 1/7" — người chạy chỉ thấy nó im lặng thoát. Sửa: `envget` dùng `sed -n "s/^$1=//p"`
(trả 0 kể cả khi không khớp), và thêm `ACME_DIR=/var/www/acme`, `NGINX_DIR=/opt/tcg/nginx`
vào `docker/.env.example`. Đã kiểm chứng bằng một test bash độc lập tái hiện đúng cú thoát.

**14. Comment nằm GIỮA các dòng nối `\` của `docker run` — lỗi do chính tôi gây ra.**
`./docker/dev-macos.sh` chỉ dựng được **15/19 container**; thiếu `op-adapter`, `op-admin`,
`op-php`, `op-nginx`, và seed in `admin_users 0`. Thông báo duy nhất là một dòng
`docker: 'docker run' requires at least 1 argument`. Nguyên nhân: hai khối ghi chú tiếng Việt
tôi thêm ở lần trước nằm *bên trong* khối `docker run -d --name op-adapter ... \`. Shell kết
thúc lệnh ngay tại dòng comment đầu tiên, nên `docker run` chạy không có image; phần còn lại
thành các lệnh rác. Sửa: dời toàn bộ ghi chú lên **trên** khối lệnh.

Hai điều rút ra, vì đây là loại lỗi dễ lặp lại:
- **`bash -n` không bắt được** — cú pháp hoàn toàn hợp lệ, chỉ là lệnh bị cắt sớm.
- **`shellcheck` BẮT ĐƯỢC** (`SC2215: This flag is used as a command name. Bad line break?`,
  mức *warning*). Lý do nó không kêu lần trước: dòng lệnh ở mục 0.4 chỉ liệt kê
  `enable-domain.sh`, `server-bootstrap.sh`, `gen-env.sh` — **không có `dev-macos.sh`**. Đã
  thêm vào (mục 0.4) và đã quét toàn bộ `*.sh` của repo: không còn chỗ nào vi phạm.


## 8. Trước khi commit — bắt buộc

`web-entrypoint` của container php **sed thẳng vào cây nguồn** (bind mount): thay `192.168.1.69` → `127.0.0.1` trong 3 file và điền mật khẩu thật vào ~10 file PHP. Vì vậy:

```bash
docker rm -f op-php op-nginx                       # dừng trước, không thì nó điền lại ngay
git checkout -- website/game/ && rm -f website/game/.public-host
python3 tools/mask-secrets.py --check              # PHẢI in "sach"; "DA DIEN" hay "CON SOT" = chưa được commit
git status --short                                 # không có docker/.dev-macos/, docker/.env, website/game/res|sound|spine
```

Commit message tiếng Việt, một dòng tóm tắt + thân mô tả kết quả đo được, kết thúc bằng trailer `Co-Authored-By` theo quy ước phiên. Không push nếu người dùng chưa bảo.
