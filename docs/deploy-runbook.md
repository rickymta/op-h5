# Runbook triển khai lên server mới (4 CPU / 8 GB / 40 GB)

Làm **theo đúng thứ tự**, mỗi bước có điểm kiểm tra. Ký hiệu: `[PC]` chạy trên máy Windows của bạn, `[CŨ]` trên server cũ `pgaming`, `[MỚI]` trên server mới. Tất cả lệnh Linux chạy bằng `root`.

Đầu vào đã có: repo `github.com/rickymta/op-h5` (JAR qua LFS), release `assets-v1` (res/sound/spine 1.33 GB), giá trị secrets thật trong `_backup-secrets-original/` trên PC, server cũ còn chạy với DB thật.

---

## Tóm tắt lệnh — bản rút gọn để copy (Ubuntu, Docker đã cài, ufw đã mở 22/80/443)

Trạng thái 2026-09-04: repo + release `assets-v1` + image GHCR (public, CI xanh 3/3) đã sẵn. Chưa chạy bước nào trên server mới. Ký hiệu `[PC]` máy Windows, `[CŨ]` pgaming, `[MỚI]` Ubuntu. Lệnh Linux chạy bằng root.

**1 `[PC]` Lấy secrets** (13 giá trị, bảng ở Bước 0 bên dưới):
```bash
cd E:/DATA/Games/HacTacHuyenThoaiH5/game && python tools/mask-secrets.py --restore
# ... chép giá trị ra một chỗ ...
python tools/mask-secrets.py --mask && python tools/mask-secrets.py --check
```
Chọn `PUBLIC_HOST` = IP public server mới; dùng `http://` (client hardcode `http://…:9000`, chưa dùng 443).

**2 `[CŨ]` Dump DB** (chưa tắt server cũ):
```bash
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/prepare-dumps.sh -o /tmp/prepare-dumps.sh
export MYSQL_PW='<root mysql>' MONGO_PW='<mongo abc123>' && bash /tmp/prepare-dumps.sh
sed -i 's/192\.168\.1\.69/<PUBLIC_HOST>/g' /tmp/tcg-dumps/mysql/00-tcg.sql && ls /tmp/tcg-dumps/mysql /tmp/tcg-dumps/mongo/dump
```
Phải có `00-tcg.sql stat.sql web.sql cdks.sql game_s1.sql` + thư mục Mongo `tcg cross-yzx1 game-s1` (+ `admin`). Server cũ **không có** `statistic` và `group-offical` — hai DB đó được service tự tạo khi chạy, không phải lỗi dump. (Dump 2026-09-05 đã nằm sẵn ở `docker/initdb/` trên PC; server cũ chạy MongoDB 5.0.6 không có `mongodump`, phải tải MongoDB Database Tools rồi bật `mongod` tạm — xem mục Bước 1.)

**3 `[MỚI]` Port + compose + rsync:**
```bash
ufw allow 9000/tcp && ufw allow 8001/tcp && ufw allow 12345/tcp && ufw allow 7788/tcp && ufw allow 8080/tcp && ufw status numbered   # 8080 = he thong ID
docker compose version || apt-get install -y docker-compose-plugin
apt-get install -y rsync curl
```

**4 `[MỚI]` Bootstrap** (swap 4 GB, tải 1.33 GB assets từ release, lấy `docker/` về `/opt/tcg/docker`):
```bash
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | MODE=pull bash
ls /opt/tcg/assets/res | wc -l && ls /opt/tcg/docker          # 10584
```

**5 `[MỚI]` Kéo dump:**
```bash
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mysql/      /opt/tcg/docker/initdb/mysql/
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mongo/dump/ /opt/tcg/docker/initdb/mongo/dump/
```

**6 `[MỚI]` `.env`:**
```bash
cd /opt/tcg/docker && nano .env      # PUBLIC_HOST + 14 secret PHP/Java + nen tang (xem Buoc 4)
H=$(grep ^PUBLIC_HOST= .env | cut -d= -f2-); sed -i "s|^ID_ISSUER=.*|ID_ISSUER=http://$H:8080|; s|^ADAPTER_REDIRECT_URI=.*|ADAPTER_REDIRECT_URI=http://$H/auth/callback|" .env
sed -i "s|^ADAPTER_SECRET_ENC_KEY=.*|ADAPTER_SECRET_ENC_KEY=$(head -c 32 /dev/urandom | base64)|; s|^ID_INTERNAL_SECRET=.*|ID_INTERNAL_SECRET=$(head -c 32 /dev/urandom | base64)|" .env
printf 'ID_SIGNING_KEY_PEM="%s"\n' "$(openssl genrsa 2048 2>/dev/null)" >> .env
grep -E '^(PUBLIC_HOST|TCG_SECRET|MYSQL_ROOT_PASSWORD|MONGO_PASSWORD|RABBITMQ_PASSWORD|CONSOLE_ADMIN_PASSWORD|ID_ISSUER|ADAPTER_REDIRECT_URI|ADAPTER_SECRET_ENC_KEY|ADMIN_BOOTSTRAP_USER|ADMIN_BOOTSTRAP_PASSWORD)=$' .env && echo "CON TRONG" || echo OK
```
Ba mật khẩu MySQL/Mongo/MQ **phải đúng như server cũ** (dump tạo bằng chúng). `CONSOLE_ADMIN_PASSWORD` giờ còn được adapter dùng để phát vật phẩm qua console. `ADMIN_BOOTSTRAP_USER/PASSWORD` = tài khoản owner đầu tiên của trang quản trị. `platform-seed` tự tạo DB `platform` và seed `oauth_clients/games/game_servers/game_devices/game_packages` (1962 gói từ `id.txt`) — không chạy SQL tay.

**7 `[MỚI]` Hạ tầng + import dump:**
```bash
cd /opt/tcg/docker && docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d mysql mongo rabbitmq
docker compose -f docker-compose.image.yml logs -f mysql | grep -m1 'ready for connections'     # Ctrl+C khi thấy
docker compose -f docker-compose.image.yml exec mysql mysql -uroot -p"$(grep ^MYSQL_ROOT_PASSWORD= .env | cut -d= -f2-)" -e "SHOW DATABASES; SELECT code,name,ws_port FROM tcg.srv_game;"
```
Thiếu DB → `docker compose -f docker-compose.image.yml down -v` rồi làm lại bước 7.

**8 `[MỚI]` Lên toàn bộ:**
```bash
docker compose -f docker-compose.image.yml up -d          # gom ca id/adapter/admin + platform-seed
watch -n5 'docker compose -f docker-compose.image.yml ps'      # 5–8 phút, tất cả healthy; platform-seed "Exited (0)"
```

**9 `[MỚI]` Kiểm tra:**
```bash
docker compose -f docker-compose.image.yml logs game | grep -E '找不到excel|找不到sheet|加载错误|OutOfMemory'; echo "(rong = tot)"
curl -s -o /dev/null -w 'console %{http_code}\n' http://127.0.0.1:9999/conf/global/get; curl -sI http://127.0.0.1/play-game | head -1
curl -sI http://127.0.0.1/ | head -1; curl -s http://127.0.0.1:8080/.well-known/openid-configuration | head -c 120; echo   # trang chu (adapter) 200; ID tra JSON
docker compose -f docker-compose.image.yml logs platform-seed | tail -8       # 6 dong dem, tat ca > 0
docker stats --no-stream
```
Từ máy khác: `http://PUBLIC_HOST/play-game` → đăng ký → vào game. Màn đen: F12 xem client gọi `PUBLIC_HOST:9000` hay `192.168.1.69`.

Ba chỗ dễ vấp: mật khẩu `.env` không khớp dump (6); volume cũ chặn import (7); nginx rewrite là suy đoán từ mã PHP, đăng ký/đăng nhập web có thể cần chỉnh `nginx/game.conf` (9).

---

## Bước 0 — Chuẩn bị trên PC (10 phút)

**0.1 Gom secrets thành `secrets.env`** (file này đã gitignored, chỉ ở PC):

```bash
cd E:/DATA/Games/HacTacHuyenThoaiH5/game
python tools/mask-secrets.py --restore          # lấy lại giá trị thật vào cây
```

Mở các file sau, chép giá trị vào một file tạm theo bảng trong `SECRETS.md` (13 placeholder):

| Placeholder | Lấy ở |
|---|---|
| `__TCG_SECRET__` | `server/console/config/env.yml` → `secret:` |
| `__MYSQL_ROOT_PASSWORD__` | `server/console/config/env.yml` → `mysqlConf.password` |
| `__MONGO_PASSWORD__` | `server/console/config/env.yml` → `mongoConf.password` |
| `__RABBITMQ_PASSWORD__` | `server/console/store/global.conf.json` → `stat.mq.password` |
| `__CONSOLE_ADMIN_PASSWORD__` | `website/game/gmhanglong/config/config.php` → `'password'` |
| `__WEB_DB_PASSWORD_REV__` | `website/game/adminphp@2024/rev.php` → PDO |
| `__THESIEUTOC_API_KEY__`, `__MOMO_CALLBACK_SIGNATURE__`, `__REV_QUERY_KEY__`, `__GM_CODE__`, `__GMHANGLONG_CODE__`, `__GM_LOGIN_TOKEN__`, `__MOMO_PHONE__` | `api/card.php`, `api/momoCallback.php`, `adminphp@2024/rev.php`, `gm/config.php`, `gmhanglong/config/config.php`, `gm/user/function/common.php`, `user/naptien.php` |

Rồi che lại ngay để không lỡ commit:

```bash
python tools/mask-secrets.py --mask && python tools/mask-secrets.py --check     # phải "sach"
```

**0.2 Quyết định `PUBLIC_HOST`**: IP public (hoặc domain đã trỏ) của server mới. Người chơi sẽ mở `http://PUBLIC_HOST/play-game`; client kết nối `PUBLIC_HOST:9000` (login), `:8001` (WebSocket game), `:12345`, `:7788`. **Firewall/security group phải mở 80, 9000, 8001, 12345, 7788 và 8080** (hệ thống ID: trình duyệt người chơi đăng nhập OIDC tại `http://PUBLIC_HOST:8080` khi chưa có domain) ra ngoài; các port còn lại (3306, 27017, 5672, 9999, 10010, 10086, 20001, 30001, 18001, 9001, 8090, 8100) chỉ nội bộ — adapter và admin chỉ bind 127.0.0.1.

---

## Bước 1 — Dump dữ liệu trên server cũ (15–30 phút, tuỳ DB)

```bash
# [CŨ]
scp  root@<PC-hoac-git>:docker/prepare-dumps.sh /tmp/   # hoặc: curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/prepare-dumps.sh -o /tmp/prepare-dumps.sh
export MYSQL_PW='<mật khẩu root mysql>' MONGO_PW='<mật khẩu mongo abc123>'
bash /tmp/prepare-dumps.sh
```

Điểm kiểm tra: `/tmp/tcg-dumps/mysql/` có `00-tcg.sql`, `stat.sql`, `web.sql`, `cdks.sql`, `game_s1.sql` (+ `game_s2…` nếu có); `/tmp/tcg-dumps/mongo/dump/` có `tcg/`, `cross-yzx1/`, `game-s1/` (DB per-server tên `game-<srvCode>`, không phải `mongoCode`) và `admin/`. `statistic/`, `group-offical/` chỉ xuất hiện nếu service đó từng chạy — trên server cũ không có.

**Server cũ (pgaming) không có `mongodump`** (MongoDB 5.0.6 cài tarball ở `/usr/local/mongodb`, `mongod` không tự bật sau reboot). Cách đã dùng 2026-09-05: tải `mongodb-database-tools-rhel70-x86_64-100.9.5.tgz` (62,6 MB, fastdl.mongodb.org) vào `/tmp`, giải nén, `mongod -f /usr/local/mongodb/mongodb.conf`, `mongodump -u abc123 --authenticationDatabase admin --out /tmp/tcg-dumps/mongo/dump`, rồi `mongod --shutdown --dbpath /usr/local/mongodb/data`. Bỏ `admin/` khi đặt vào `docker/initdb/mongo/dump/` (user `abc123` do image tạo từ `.env`; `system.version` của 5.0 không nên restore vào `mongo:4.4`).

**Sửa IP cũ trong dump** (4 dòng đang là `192.168.1.69`: `cloud_device.host_wan`, `srv_cross.url`, `srv_group_device.url`, `srv_login.host_wan`):

```bash
# [CŨ]
grep -c '192\.168\.1\.69' /tmp/tcg-dumps/mysql/00-tcg.sql          # dump 2026-09-05: đúng 4 dòng
sed -i 's/192\.168\.1\.69/<PUBLIC_HOST>/g' /tmp/tcg-dumps/mysql/00-tcg.sql
```

(Trên cùng máy, `PUBLIC_HOST` cũng được vì host network; cross/group gọi nhau qua IP public của chính máy.)

**Không tắt server cũ lúc này** — bước 3 còn rsync dump từ nó, và nó là đường lùi nếu server mới trục trặc. Nếu muốn dữ liệu "đóng băng" (không ai chơi trong lúc chuyển), tắt game trước khi dump: `/h5/server/stop.sh` (script này **xoá log**).

---

## Bước 2 — Bootstrap server mới (10–20 phút)

**Ubuntu — trước bootstrap:** mở port cho client và kiểm tra compose plugin (`apt install docker.io` không kèm plugin):

```bash
ufw allow 9000/tcp && ufw allow 8001/tcp && ufw allow 12345/tcp && ufw allow 7788/tcp && ufw allow 8080/tcp && ufw status numbered   # 8080 = he thong ID
docker compose version || apt-get install -y docker-compose-plugin
apt-get install -y rsync curl
```

`443` chưa dùng: client bundle hardcode `http://PUBLIC_HOST:9000` nên trang phải là `http://`; bật HTTPS sau sẽ gặp mixed-content, cần sửa bundle. Host network nên `ufw` **có** tác dụng với container (khác bridge network); các port nội bộ vẫn đóng.


```bash
# [MỚI]
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | MODE=pull bash
```

`MODE=pull` (khuyến nghị — image đã build sẵn và public trên GHCR): tạo swap 4 GB, **tải `client-assets.tar.gz` từ release vào `/opt/tcg/assets`**, lấy thư mục `docker/` về `/opt/tcg/docker`, kiểm tra port. Không cần git/LFS trên server. (`MODE=build` = clone + build tại chỗ, tốn 611 MB LFS.)

Điểm kiểm tra khi script kết thúc:

```bash
ls /opt/tcg/assets/res | wc -l                              # 10584
ls /opt/tcg/docker                                          # docker-compose.image.yml, .env, initdb/, ...
```

---

## Bước 3 — Chuyển dump sang server mới (5 phút)

```bash
# [MỚI]
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mysql/       /opt/tcg/docker/initdb/mysql/
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mongo/dump/  /opt/tcg/docker/initdb/mongo/dump/
ls /opt/tcg/docker/initdb/mysql/ /opt/tcg/docker/initdb/mongo/dump/
```

(Không rsync `res/` nữa — đã có từ release.)

---

## Bước 4 — Điền `.env` (5 phút)

```bash
# [MỚI]
cd /opt/tcg/docker && nano .env
```

Bắt buộc điền: `PUBLIC_HOST`, `TCG_SECRET`, `MYSQL_ROOT_PASSWORD`, `MONGO_PASSWORD`, `RABBITMQ_PASSWORD` (phải **khớp dump** — DB được tạo với đúng mật khẩu này), `CONSOLE_ADMIN_PASSWORD` (adapter dùng tài khoản `admin` của console để phát vật phẩm) và các secret PHP. `ASSETS_DIR=/opt/tcg/assets` giữ nguyên. Heap giữ mặc định lần đầu.

Nền tảng (`id`/`adapter`/`admin`) — chưa có domain thì dùng IP:

```bash
# [MỚI]
H=$(grep ^PUBLIC_HOST= .env | cut -d= -f2-)
sed -i "s|^ID_ISSUER=.*|ID_ISSUER=http://$H:8080|; s|^ADAPTER_REDIRECT_URI=.*|ADAPTER_REDIRECT_URI=http://$H/auth/callback|" .env
sed -i "s|^ADAPTER_SECRET_ENC_KEY=.*|ADAPTER_SECRET_ENC_KEY=$(head -c 32 /dev/urandom | base64)|; s|^ID_INTERNAL_SECRET=.*|ID_INTERNAL_SECRET=$(head -c 32 /dev/urandom | base64)|" .env
printf 'ID_SIGNING_KEY_PEM="%s"\n' "$(openssl genrsa 2048 2>/dev/null)" >> .env      # gia tri nhieu dong trong ngoac kep, de cuoi file
nano .env      # ADMIN_BOOTSTRAP_USER / ADMIN_BOOTSTRAP_PASSWORD
```

Khi có domain: `ID_ISSUER=https://id.<domain>`, `ADAPTER_REDIRECT_URI=https://<game-domain>/auth/callback`, `ID_COOKIE_SECURE=true`, thêm vhost nginx `id.<domain>` → `127.0.0.1:8080`; `platform-seed` cập nhật `oauth_clients.redirect_uris` ở lần `up` kế.

Kiểm tra không còn ô trống bắt buộc:

```bash
grep -E '^(PUBLIC_HOST|TCG_SECRET|MYSQL_ROOT_PASSWORD|MONGO_PASSWORD|RABBITMQ_PASSWORD|CONSOLE_ADMIN_PASSWORD|ID_ISSUER|ADAPTER_REDIRECT_URI|ADAPTER_SECRET_ENC_KEY|ADMIN_BOOTSTRAP_USER|ADMIN_BOOTSTRAP_PASSWORD)=$' .env && echo "CON TRONG" || echo "OK"
grep -c 'BEGIN.*PRIVATE KEY' .env      # 1
```

---

## Bước 5 — Khởi động (10 phút)

Lên hạ tầng trước, đợi import dump xong (lần đầu MySQL import vài phút):

```bash
# [MỚI]  cd /opt/tcg/docker
docker compose -f docker-compose.image.yml up -d mysql mongo rabbitmq
docker compose -f docker-compose.image.yml logs -f mysql | grep -m1 'ready for connections'     # Ctrl+C khi thấy
docker compose -f docker-compose.image.yml ps                                                    # 3 container "healthy"
```

Kiểm tra dữ liệu đã vào:

```bash
docker compose -f docker-compose.image.yml exec mysql mysql -uroot -p"$(grep ^MYSQL_ROOT_PASSWORD= .env | cut -d= -f2-)" -e "SHOW DATABASES; SELECT code,name,ws_port FROM tcg.srv_game;"
docker compose -f docker-compose.image.yml exec mongo mongo -u abc123 -p "$(grep ^MONGO_PASSWORD= .env | cut -d= -f2-)" --authenticationDatabase admin --quiet --eval 'db.adminCommand("listDatabases").databases.map(d=>d.name)'
```

Phải thấy `tcg stat web cdks game_s1` (DB `platform` xuất hiện khi `platform-seed` chạy ở bước kế) và Mongo có `tcg`, `cross-yzx1`, `game-s1` (`statistic`, `group-offical` do service tự tạo). Nếu thiếu → dump chưa import (volume đã có từ lần chạy trước): `docker compose -f docker-compose.image.yml down -v` rồi làm lại bước 5.

Lên toàn bộ:

```bash
docker compose -f docker-compose.image.yml up -d
watch -n5 'docker compose -f docker-compose.image.yml ps'      # 5–8 phút, tất cả "healthy"
```

Thứ tự tự động: console → world → meta → statistic → pay → group → game → login → cross → php/nginx; song song: `platform-seed` (tạo DB `platform`, đợi `id` migrate xong rồi seed, thoát 0) và `id` → `admin`; `adapter` chờ cả `id`, `platform-seed`, `login`. Nếu một service **unhealthy** lâu, xem log của nó (bước 6). `platform-seed` ở `Exited (0)` là đúng; `Exited (1)` thì xem `logs platform-seed`.

---

## Bước 6 — Kiểm tra (5 phút)

```bash
C="docker compose -f docker-compose.image.yml"
$C logs console   | grep -E 'Started|ERROR' | tail -3
$C logs game      | grep -E '找不到excel|找不到sheet|加载错误|OutOfMemory' ; echo "(rỗng = Excel đủ, heap đủ)"
$C logs group     | grep -iE 'OutOfMemory|GC overhead' ; echo "(rỗng = OK)"
$C logs game      | grep -m1 '游戏启动配置'              # in toàn bộ cấu hình đã resolve (wsPort, mongo, cross)
curl -s -o /dev/null -w 'console %{http_code}\n' http://127.0.0.1:9999/conf/global/get
curl -sI http://127.0.0.1/play-game | head -1              # HTTP/1.1 200
docker stats --no-stream                                   # RAM thật từng container
```

Từ máy khác: mở `http://PUBLIC_HOST/play-game` — client phải nạp được (loading bar), đăng ký/đăng nhập được, vào game được. Nếu client treo ở màn đen: F12 → Console → xem nó gọi `PUBLIC_HOST:9000` hay vẫn `192.168.1.69` (entrypoint chưa thay → kiểm tra `PUBLIC_HOST` trong `.env`, `$C restart nginx php`).

---

## Bước 7 — Sau khi ổn định

- **Hạ heap theo số đo**: sau 30 phút, `docker stats` → sửa `JAVA_XMX_*`/`mem_limit`, `$C up -d` (chỉ service đổi bị tạo lại).
- **Cron dọn log Java** (SSD 40 GB): `echo '0 4 * * * docker compose -f /opt/tcg/docker/docker-compose.image.yml exec -T game find /h5/server -path "*/.logs/*" -name "*.log" -mtime +7 -delete' | crontab -` (tương tự các service khác, hoặc chấp nhận log mất khi container tạo lại).
- **Backup** hàng ngày: xem `docker/README.md` mục 6.
- **Tắt server cũ** khi đã xác nhận người chơi vào được server mới.

---

## Cập nhật về sau

Sửa Excel/PHP/config trên PC → `python tools/mask-secrets.py --check` → commit/push → trên server:

```bash
cd /opt/tcg/src && git pull && git lfs pull && cd docker && docker compose -f docker-compose.image.yml up -d --build
```

Chỉ sửa Excel thì không cần tạo lại container: copy file vào `/h5/server/excel/release/` trong container game rồi `POST /srv/game/cmd/excel/reload` (CLAUDE.md mục 6) — hoặc đơn giản là `--build` như trên.

## Nếu hỏng — quay lại

Server cũ vẫn nguyên cho tới khi bạn chủ động tắt. Trên server mới: `$C down` (giữ DB) hoặc `$C down -v` (xoá DB, import lại dump).
