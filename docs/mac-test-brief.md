# Giao việc: chạy thử toàn bộ hệ thống trên macOS với bộ seed sạch

Tài liệu này viết cho một phiên Claude Code chạy trên máy macOS có Docker Desktop. Đọc hết trước khi làm. Mọi thứ cần biết nằm ở đây, [CLAUDE.md](../CLAUDE.md) (mục 15–16) và [docker/README.md](../docker/README.md).

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
| 5.1 | zz-init.sh nạp seed, không còn placeholder, 101 bảng | | |
| 5.2 | 9 JVM `running`, `GameLoading` đúng host/port | | |
| 5.3 | game không thiếu Excel; group không OOM; `game_s1` tự tạo | | |
| 5.4 | console 200, `/srv/game/list` có s1, web 200, OIDC JSON | | |
| 5.5 | đăng ký → `/choi-game` → WebSocket 8001 → tạo nhân vật | | |
| 5.6 | platform-seed 6 dòng đếm | | |
| — | RAM thật (`docker stats --no-stream`, tổng) | | |
| — | Thời gian từ lúc chạy tới khi login lên | | |

Lỗi gặp và cách xử lý (nguyên văn, đã che mật khẩu):

- …

## 8. Trước khi commit — bắt buộc

`web-entrypoint` của container php **sed thẳng vào cây nguồn** (bind mount): thay `192.168.1.69` → `127.0.0.1` trong 3 file và điền mật khẩu thật vào ~10 file PHP. Vì vậy:

```bash
docker rm -f op-php op-nginx                       # dừng trước, không thì nó điền lại ngay
git checkout -- website/game/ && rm -f website/game/.public-host
python3 tools/mask-secrets.py --check              # PHẢI in "sach"; "DA DIEN" hay "CON SOT" = chưa được commit
git status --short                                 # không có docker/.dev-macos/, docker/.env, website/game/res|sound|spine
```

Commit message tiếng Việt, một dòng tóm tắt + thân mô tả kết quả đo được, kết thúc bằng trailer `Co-Authored-By` theo quy ước phiên. Không push nếu người dùng chưa bảo.
