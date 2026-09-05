# Chạy game server bằng Docker — máy 4 CPU / 8 GB RAM / 40 GB SSD

Bộ này chạy **toàn bộ stack** (MySQL, MongoDB, RabbitMQ, 9 service Java, nginx + PHP cho client/cổng nạp/GM) trên một máy nhỏ. Chưa được chạy thử ở đâu ngoài lint cú pháp — lần `up` đầu tiên là lần test thật, làm từng bước và đọc log.

## 0. Vì sao `network_mode: host`

Toàn bộ cấu hình trỏ `127.0.0.1`: `server/*/config/env.yml`, `console/store/global.conf.json`, **và cả các dòng trong MySQL** (`tcg.srv_game`, `cloud_server`: `hostLan=127.0.0.1`). Dùng bridge network thì phải sửa hết, kể cả dữ liệu trong DB mà không có cách kiểm chứng. Host network giữ nguyên bố cục bare-metal: mỗi container nghe đúng port cũ trên máy.

Hệ quả: **tắt MySQL/MongoDB/RabbitMQ/Java/nginx đang chạy trên máy đó** trước khi `up`, nếu không sẽ trùng port. Host network chỉ có trên Linux (không phải Docker Desktop Windows/Mac).

## 1. Ngân sách tài nguyên

| Thành phần | mem_limit | Heap/cache | Ghi chú |
|---|---|---|---|
| game | 1400m | -Xmx1024m | ưu tiên CPU cao nhất |
| world, group, cross | 950m ×3 | -Xmx640m | parse ~200 Excel lúc khởi động → peak |
| console, statistic | 800m ×2 | -Xmx512m | |
| pay | 640m | -Xmx384m | |
| meta, login | 560m ×2 | -Xmx320m | |
| mysql | 768m | buffer pool 192M | `skip-log-bin`, performance_schema OFF |
| mongo | 640m | WiredTiger 0.25 GB | |
| rabbitmq | 384m | watermark 256MB | |
| php + nginx | 192m + 96m | pm=ondemand ×8 | |

Tổng `mem_limit` ≈ 9.5 GB **là trần**, không phải mức dùng thật; khởi động tuần tự nên peak của các service không chồng nhau. Vẫn **bắt buộc tạo swap** để không bị OOM-kill lúc peak:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10
```

JVM dùng `SerialGC` (ít thread, ít RAM; đủ cho server ít người). Nếu thấy `GC overhead limit exceeded` hoặc container bị `OOMKilled` (`docker inspect <c> | grep OOMKilled`): tăng `JAVA_XMX_*` tương ứng trong `.env` thêm 128–256m và hạ service khác. Đo thật bằng `docker stats` sau 10 phút chạy ổn định rồi hạ `mem_limit` cho sát.

CPU: dùng `cpu_shares` (mềm) chứ không ép cứng, vì parse Excel lúc khởi động cần CPU; `game` được ưu tiên gấp đôi.

Đĩa 40 GB: image ~1.5 GB, cây `server/` ~0.8 GB, `website/game` ~1.6 GB, DB tuỳ dữ liệu. Log container đã giới hạn 10 MB × 3. Log của Java nằm trong `server/*/.logs/` và **không tự xoá** — thêm cron:

```bash
echo '0 4 * * * find /h5/server -path "*/.logs/*" -name "*.log" -mtime +7 -delete' | crontab -
```

## 2. Dữ liệu MySQL: seed sạch trong git, dump server cũ chỉ là tuỳ chọn

Không JAR nào chứa schema của `tcg`/`stat`/`web`/`cdks` hay Mongo (chỉ `tcg-game.jar` có 4 bảng `stat_*`), và ORM là MyBatis-Plus không auto-DDL. Từ 2026-09-05 schema + dữ liệu cấu hình tối thiểu nằm sẵn trong **`initdb/mysql/seed/*.sql`** (sinh bởi `tools/dump-to-seed.py` từ dump thật, đã che sạch bí mật; `python tools/dump-to-seed.py --check` để kiểm lại). Lần đầu MySQL khởi tạo, `initdb/mysql/zz-init.sh`:

1. không thấy `tcg.srv_game` → nạp seed (59 bảng `tcg`, 20 `stat`, 21 `web`, 1 `cdks`; dữ liệu chỉ ở ~20 bảng cấu hình: `srv_game` s1, `srv_group(_device)`, `srv_cross`, `cloud_device/mysql/mongo/mq`, `app`, `srv_game_access`, `dynamic_conf`, `staff*`, `web.tichluy/webshop`);
2. **dù seed hay dump thật**: ghi `MYSQL/MONGO/RABBITMQ_PASSWORD` của `.env` vào `tcg.cloud_*` (game/cross/group lấy credential ở đó, không đọc `env.yml`), `CONSOLE_ADMIN_PASSWORD` vào `tcg.staff`, `PUBLIC_HOST` vào `cloud_device`/`srv_login`, URL cross/group → `127.0.0.1`, tắt giới hạn platform ở `srv_game_access` (Adapter gọi `/srv/game/list` không kèm `platformCode`);
3. thêm máy chủ theo `GAME_SERVERS` (copy dòng s1).

Nên **`.env` không cần khớp mật khẩu server cũ nữa**, và Mongo/`game_sX` không cần dump (service tự tạo). Chỉ khi muốn giữ tài khoản/nhân vật cũ mới dump:

```bash
export MYSQL_PW='...' MONGO_PW='...'
bash prepare-dumps.sh          # -> /tmp/tcg-dumps/{mysql/*.sql, mongo/dump/}  -> đặt vào initdb/mysql/ và initdb/mongo/dump/ (gitignored)
```

Có dump `*.sql` trong `initdb/mysql/` thì seed **không** được nạp. Đồng thời tắt game cũ khi cắt chuyển: `/h5/server/stop.sh` (lưu ý script này **xoá log**).

## 3. Chuẩn bị trên máy Docker

Yêu cầu: Docker Engine 24+ và plugin `docker compose` v2 trên Linux.

```bash
# 1. Cây thư mục: /opt/tcg/{server,website,docker}  (đường dẫn tuỳ, chỉnh SERVER_DIR/WEBSITE_DIR trong .env)
#    server/ là bản đã vá (JAR patched + Excel tên tiếng Anh + 5 file tái tạo + 6 sheet bổ sung)
# 2. (Tuỳ chọn) dump thật — không có thì zz-init.sh nạp seed sạch trong git
cp /path/tcg-dumps/mysql/*.sql   docker/initdb/mysql/
cp -r /path/tcg-dumps/mongo/dump docker/initdb/mongo/
chmod +x docker/initdb/mongo/restore.sh docker/prepare-dumps.sh
# 3. Cấu hình: sinh .env với bí mật ngẫu nhiên (mật khẩu KHÔNG cần khớp server cũ — zz-init.sh ghi vào DB)
cd docker && ./gen-env.sh <IP-hoặc-domain>          # in ra tài khoản quản trị + console; sửa tay thêm nếu cần
```

Sửa IP công khai (WAN) — 2 chỗ, thay `192.168.1.69` bằng IP/domain thật của máy mới:

```bash
grep -rl '192.168.1.69' ../server/console/store/global.conf.json ../website/game/a3b31-4c087-1dc2f.js ../website/game/play.php ../website/game/new ../website/game/adminphp@2024
sed -i 's/192\.168\.1\.69/<IP-MOI>/g' ../server/console/store/global.conf.json ../website/game/a3b31-4c087-1dc2f.js ../website/game/play.php ../website/game/new/config.php ../website/game/new/webshop.php ../website/game/adminphp@2024/check.php
```

(Dữ liệu trong MySQL `cloud_server.hostWan` cũng đang là `192.168.1.69` — sửa qua GM console `/srv/game/…` sau khi lên, hoặc `UPDATE tcg.cloud_server SET host_wan='<IP-MOI>'` trước khi import.)

## 4. Khởi động

```bash
cd docker
docker compose build php
docker compose up -d mysql mongo rabbitmq        # đợi healthy (~1 phút), lần đầu import dump có thể vài phút
docker compose logs -f mysql | grep -m1 'ready for connections'
docker compose up -d                              # console -> world -> meta -> statistic -> pay -> group -> game -> login -> cross -> web
watch -n5 'docker compose ps'                     # đợi tất cả (healthy)
```

Toàn bộ chuỗi mất **5–8 phút** trên 4 CPU (game một mình ~50 s parse Excel).

## 5. Kiểm tra

```bash
docker compose ps                                          # tất cả "healthy"
docker compose logs game | grep -E '找不到excel|找不到sheet|加载错误'   # rỗng = Excel đủ
docker compose logs group | grep -iE 'OutOfMemory|GC overhead'         # rỗng = heap đủ
curl -s -o /dev/null -w 'console %{http_code}\n' http://127.0.0.1:9999/conf/global/get
curl -sI http://127.0.0.1/play-game | head -1              # 200 = nginx + php ok
docker stats --no-stream                                   # đo RAM thật, chỉnh .env
```

Nạp lại Excel nóng sau khi sửa: `curl -X POST http://127.0.0.1:9999/srv/game/cmd/excel/reload` (cần `Login-Token` từ `POST /staff/login`).

## 5b. Nhiều game server và hai dịch vụ nền tảng

Compose không có vòng lặp và `--scale` không dùng được (mỗi game server cần `--sc` và
`wsPort` riêng), nên đội server được sinh ra từ một dòng trong `.env`:

```bash
# .env:  GAME_SERVERS=s1:8001:host-01,s2:8002:host-01,s3:8003:host-02
#                      ^   ^     ^ device_code (máy vật lý)
#                      |   wsPort — HTTP nội bộ LUÔN là wsPort + 10000
#                      srvCode, khớp dòng trong tcg.srv_game
./gen-game-servers.sh --write        # -> docker-compose.game.yml
docker compose -f docker-compose.yml -f docker-compose.game.yml \
               -f docker-compose.platform.yml up -d
```

Bộ sinh **từ chối** trùng `srvCode`, trùng `wsPort`, và trường hợp khó thấy hơn: `wsPort`
của server này đụng port HTTP (`wsPort+10000`) của server kia. File sinh ra tự chứa
(không dùng `<<: *java`) vì YAML anchor không băng qua được ranh giới file trong Compose.

Nó cũng vô hiệu hoá service `game` mặc định bằng profile, và thay hẳn `depends_on` của
`login` bằng `!override` để `login` chờ **mọi** game server — nếu chỉ ghi đè thường,
Compose hợp nhất map và giữ lại phụ thuộc vào `game` đã bị tắt.

**RAM là ràng buộc thật:** mỗi game server thêm ~1,2 GB. Máy 8 GB chỉ vừa **một** server
cùng hạ tầng. Thêm server là thêm máy, và `device_code` phải khớp máy thật vì cổng giới
hạn tải dùng nó làm tầng thứ hai.

`docker-compose.platform.yml` thêm ba dịch vụ Go và một bước seed (xem [platform/README.md](../platform/README.md)); `docker-compose.image.yml` **đã chứa sẵn** bốn service này (bản image, không `build:`), nên phương án 2 vẫn chỉ cần một file:

| Dịch vụ | Cổng | Việc |
|---|---|---|
| `id` | 8080 (công khai) | OIDC provider, danh tính, ví Xu — `ID_ISSUER` phải là URL trình duyệt tới được |
| `adapter` | 127.0.0.1:8090 | Đổi token ID → tài khoản game, **cổng giới hạn tải**; nginx proxy `/`, `/may-chu`, `/quy-doi`, `/choi-game`, `/auth/`, `/api/game/` |
| `admin` | 127.0.0.1:8100 | Trang quản trị nền tảng (đội server, ngưỡng, nạp tay); vào qua `ssh -L 8100:127.0.0.1:8100` |
| `platform-seed` | — | One-shot (mysql:8.0 + `platform-seed.sh`): tạo DB `platform`, đợi `id` migrate, upsert `oauth_clients` (từ `ADAPTER_CLIENT_ID`/`ADAPTER_REDIRECT_URI`), `games`, `game_devices` + `game_servers` (từ `tcg.srv_game`, không có thì từ `GAME_SERVERS`), `game_packages` (`platform-seed/game_packages.haitac.sql`: 1962 gói do `tools/gen-game-packages.py` sinh từ `api/id.txt` + `recharge-item.xlsx`). Chạy lại vô hại, không ghi đè tên/ngưỡng admin đã sửa. |

Tất cả đọc secret từ `.env` và **dừng ngay lúc khởi động** nếu thiếu biến bắt buộc. Adapter phát vật phẩm qua console `:9999` bằng `ADAPTER_CONSOLE_USER` (mặc định `admin`, bảng `tcg.staff`) với mật khẩu `CONSOLE_ADMIN_PASSWORD`. Tài khoản owner đầu tiên của `admin` tạo từ `ADMIN_BOOTSTRAP_USER/PASSWORD` khi `admin_users` còn trống. PHP nhận `ID_BASE_URL`/`ID_INTERNAL_SECRET`/`ID_WALLET_ENABLED` qua pool php-fpm do `web-entrypoint.sh` sinh (`clear_env` mặc định của php-fpm chặn `.env`).

## 6. Vận hành

```bash
docker compose restart game            # 1 service
docker compose down                    # dừng hết, giữ volume
docker compose down -v                 # XOÁ CẢ DB — khi muốn khởi tạo lại (seed/dump + zz-init.sh chỉ chạy lúc volume trống)
docker compose logs -f --tail=200 cross
```

Backup định kỳ (SSD 40 GB — giữ 3 bản):

```bash
docker compose exec -T mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --all-databases --single-transaction | gzip > /backup/mysql-$(date +%F).sql.gz
docker compose exec -T mongo mongodump --archive -u abc123 -p "$MONGO_PASSWORD" --authenticationDatabase admin | gzip > /backup/mongo-$(date +%F).gz
```

## 6b. Phương án 2 — server chỉ pull image, không upload JAR

`.github/workflows/build-images.yml` build 3 image mỗi khi push vào `main` (hoặc chạy tay ở tab Actions) và đẩy lên GHCR:

| Image | Chứa | Điền lúc start |
|---|---|---|
| `ghcr.io/rickymta/op-h5-server` | temurin 8 + toàn bộ `server/` (JAR, lib, Excel, config placeholder) | `server-entrypoint.sh`: `TCG_SECRET`, `MYSQL_ROOT_PASSWORD`, `MONGO_PASSWORD`, `RABBITMQ_PASSWORD`, `PUBLIC_HOST` |
| `ghcr.io/rickymta/op-h5-php` | php-fpm 7.4 + `website/game` (trừ media) | `web-entrypoint.sh`: các secret PHP + `PUBLIC_HOST` |
| `ghcr.io/rickymta/op-h5-nginx` | nginx + file tĩnh `website/game` (trừ media) | `PUBLIC_HOST` vào bundle client |

Image **không chứa secret** (an toàn public). `res/ sound/ spine/` (1.6 GB) không nằm trong git nên không nằm trong image → upload một lần vào `ASSETS_DIR` rồi mount.

Trên server mới:

```bash
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | bash
```

Script cài Docker, tạo swap 4 GB, lấy thư mục `docker/` về `/opt/tcg/docker`, in danh sách việc còn lại (điền `.env`, upload assets + dump). Rồi:

```bash
cd /opt/tcg/docker
docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d
```

**Lần đầu** phải vào GitHub → Packages → từng package `op-h5-server/php/nginx` → Package settings → *Change visibility* → Public; nếu không, server phải `docker login ghcr.io` bằng PAT có quyền `read:packages`.

**Giới hạn LFS:** free plan 1 GB bandwidth/tháng; mỗi lần CI kéo 8 JAR tốn 611 MB. Workflow cache LFS trong Actions cache nên chỉ lần build đầu (và khi JAR đổi) tốn bandwidth. Nếu hết quota: chờ tháng sau hoặc mua data pack.

Cập nhật sau này: sửa Excel/PHP → push → CI build → trên server `pull && up -d` (chỉ service có image mới bị tạo lại; DB không đụng).

## 6c. Build thẳng trên server (không cần CI/GHCR)

Dockerfile không compile gì — chỉ `COPY` JAR/Excel/PHP vào image (riêng `php` cài 2 extension, ~1 phút). Server 4 CPU / 8 GB build thoải mái; cần thêm ~2.5 GB đĩa (clone + image). `docker-compose.image.yml` có sẵn `build:` nên cùng một file dùng được cả `pull` lẫn `build`:

```bash
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | bash     # MODE=build mặc định
```

Script cài Docker + git + git-lfs, clone repo vào `/opt/tcg/src` (kéo 8 JAR qua LFS — **611 MB trong quota 1 GB/tháng**, giống một lần CI), rồi `docker compose build console php nginx`. Cập nhật sau này:

```bash
cd /opt/tcg/src && git pull && git lfs pull
cd docker && docker compose -f docker-compose.image.yml up -d --build
```

Chọn cách nào: **build trên server** nếu chỉ có một server và không muốn quản lý GHCR; **CI + pull** nếu nhiều server hoặc muốn máy chạy game không cần git. Cả hai đều dùng `.env` + entrypoint để điền secrets/IP, nên image không bao giờ chứa mật khẩu.

Kiểm tra sau clone: `ls -la /opt/tcg/src/server/statistic/*.jar` phải ~104 MB; nếu chỉ 130 byte là LFS pointer chưa được kéo (`git lfs pull`).

## 6d. Tài nguyên client — `res/ sound/ spine/` (1.6 GB, 11.000 file)

Không nằm trong git (LFS free chỉ 1 GB) và không nằm trong image. Mount vào container từ `ASSETS_DIR` (mặc định `/opt/tcg/assets`). Ba cách lấy, theo thứ tự nên dùng:

1. **rsync từ server cũ sang server mới** — nhanh nhất, không qua máy bạn, tên file trong `res/` toàn ASCII nên không lo hỏng encoding:
   ```bash
   rsync -avz --progress root@<server-cu>:/www/wwwroot/game/res   /opt/tcg/assets/
   rsync -avz --progress root@<server-cu>:/www/wwwroot/game/sound /opt/tcg/assets/
   rsync -avz --progress root@<server-cu>:/www/wwwroot/game/spine /opt/tcg/assets/
   ```
   Chạy lại lệnh là đồng bộ tiếp phần thiếu (an toàn khi đứt giữa chừng).
2. **WinSCP từ máy bạn** — kéo `website/game/{res,sound,spine}` vào `/opt/tcg/assets/`. Bật *UTF-8 encoding for filenames* dù tên là ASCII, cho thành thói quen.
3. **GitHub Release `assets-v1`** — `server-bootstrap.sh` tự tải và giải nén nếu `/opt/tcg/assets/res` còn trống (≤ 2 GB/file, không tính vào LFS, băng thông không giới hạn với repo public). Đóng gói từ bản `/www` kéo ở server cũ:
   ```bash
   tar -C www/wwwroot/game -cf - res sound spine | gzip -1 > build/client-assets.tar.gz
   sha256sum build/client-assets.tar.gz > build/client-assets.tar.gz.sha256
   gh release create assets-v1 build/client-assets.tar.gz build/client-assets.tar.gz.sha256 -t "Client assets" -n "res/ sound/ spine/ cua website/game, lay tu server pgaming 2026-09-03"
   # tren server (bootstrap lam tu dong; lam tay:)
   curl -L https://github.com/rickymta/op-h5/releases/download/assets-v1/client-assets.tar.gz | tar -xz -C /opt/tcg/assets
   ```
   Cập nhật assets sau này: tạo tag mới `assets-v2` và đặt `ASSETS_URL` khi chạy bootstrap.

Các tài nguyên client còn lại (`libs/`, `bmFont/`, `icon/`, `iconshop/`, `img/`, `assets/`, `static/`, `utility/`, ~60 MB) **đã nằm trong git và trong image** `op-h5-nginx`/`op-h5-php`. 23 file client thiếu (MISSING-FILES.md A7) là thiếu ngay trên server cũ — rsync không mang về được.

## 7. Những gì chưa chắc — đọc trước lần `up` đầu

1. **nginx rewrite đã lấy từ file gốc** (`www/server/panel/vhost/rewrite/192.168.1.69.conf`, bản copy aaPanel của server cũ, gitignored). Đăng nhập/đăng ký web thật đi qua `/user-mlogin`, `/user-mreg` → `api/config.php?act=…`; 4 đường `/user/login.php|register.php|email.php|quenmatkhau.php` không tồn tại cả trên server cũ (404), chỉ giữ map tạm. Vẫn kiểm tra đăng nhập/đăng ký web ngay sau khi lên.
2. **Heap là ước lượng.** Không có số đo steady-state từ server cũ. Bộ số mặc định để *khởi động được* trên 8 GB; chỉnh theo `docker stats`.
3. ~~Chưa từng `up` thật.~~ **Đã `up` thật trên macOS 2026-09-05** — 19 container lên hết, 9 JVM chạy, seed sạch nạp đủ 101 bảng, đăng ký → `/choi-game` → client tự đăng nhập bằng tài khoản game thật. Còn chặn ở bước vào thế giới: thiếu `website/game/template/` (xem mục 6 dưới). Chi tiết và các lỗi đã vá: [docs/mac-test-brief.md](../docs/mac-test-brief.md) mục 7.
4. **`tcg.srv_cross.url` / `srv_group_device.url`** được `zz-init.sh` đặt về `http://127.0.0.1:<port>/` lúc khởi tạo (cả seed lẫn dump) — game gọi cross/group qua loopback. Nếu sau này tách cross/group sang máy khác, đổi 2 cột `url` đó qua console `/srv/cross/update`, `/srv/group/conf/update`.
5. ~~`zz-init.sh` chưa chạy trong container MySQL thật~~ — **đã chạy**, và hỏng 3 chỗ nay đã vá: bind mount macOS làm entrypoint *chạy* thay vì *source* file; `set -u` lọt vào `docker_process_sql` của image; và `set -e` bị vô hiệu do `_tcg_init || {...}` nên lỗi nạp seed bị nuốt (web chỉ vào 2/21 bảng mà vẫn in `xong (seed)`). **Còn phải làm trên PC:** `tools/dump-to-seed.py` nên phát `ROW_FORMAT=DYNAMIC` — mysqldump 5.6 để `COMPACT`, MySQL 8 từ chối với `Row size too large (> 8126)`; hiện `zz-init.sh` đổi lúc nạp, nhưng **dump thật sẽ đâm vào đúng lỗi này** vì image nạp dump trực tiếp.
6. **Tai nguyen client**: mọi thứ đi qua bảng ánh xạ `libs/2af72-f100c-2af72.json` (tên logic → file băm trong `res/`), nên `template/`, `common/`, `atlas/` không phải thư mục trên đĩa. Thiếu thật là 21 file băm trong `res/` + 1 file `sound/` — [docs/windows-assets-handoff.md](../docs/windows-assets-handoff.md).
5. Thời điểm thay JAR mới từ nhà phát hành: chạy lại `python tools/patch-excel-names.py --apply`, nếu không bytecode quay về tìm tên Excel tiếng Trung.
