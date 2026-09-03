# Runbook triển khai lên server mới (4 CPU / 8 GB / 40 GB)

Làm **theo đúng thứ tự**, mỗi bước có điểm kiểm tra. Ký hiệu: `[PC]` chạy trên máy Windows của bạn, `[CŨ]` trên server cũ `pgaming`, `[MỚI]` trên server mới. Tất cả lệnh Linux chạy bằng `root`.

Đầu vào đã có: repo `github.com/rickymta/op-h5` (JAR qua LFS), release `assets-v1` (res/sound/spine 1.33 GB), giá trị secrets thật trong `_backup-secrets-original/` trên PC, server cũ còn chạy với DB thật.

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

**0.2 Quyết định `PUBLIC_HOST`**: IP public (hoặc domain đã trỏ) của server mới. Người chơi sẽ mở `http://PUBLIC_HOST/play-game`; client kết nối `PUBLIC_HOST:9000` (login), `:8001` (WebSocket game), `:12345`, `:7788`. **Firewall/security group phải mở 80, 9000, 8001, 12345, 7788** ra ngoài; các port còn lại (3306, 27017, 5672, 9999, 10010, 10086, 20001, 30001, 18001, 9001) chỉ nội bộ.

---

## Bước 1 — Dump dữ liệu trên server cũ (15–30 phút, tuỳ DB)

```bash
# [CŨ]
scp  root@<PC-hoac-git>:docker/prepare-dumps.sh /tmp/   # hoặc: curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/prepare-dumps.sh -o /tmp/prepare-dumps.sh
export MYSQL_PW='<mật khẩu root mysql>' MONGO_PW='<mật khẩu mongo abc123>'
bash /tmp/prepare-dumps.sh
```

Điểm kiểm tra: `/tmp/tcg-dumps/mysql/` có `00-tcg.sql`, `stat.sql`, `web.sql`, `cdks.sql`, `game_s1.sql` (+ `game_s2…` nếu có); `/tmp/tcg-dumps/mongo/dump/` có `tcg/`, `statistic/`, `cross-yzx1/`, `group-offical/` và các DB per-server (`mongo-yzxdb1`…).

**Sửa IP cũ trong dump** (các dòng `cloud_server.host_wan`, `srv_cross.url`, `srv_group_device.url` đang là `192.168.1.69`):

```bash
# [CŨ]
grep -c '192\.168\.1\.69' /tmp/tcg-dumps/mysql/00-tcg.sql          # thường 3–5 dòng
sed -i 's/192\.168\.1\.69/<PUBLIC_HOST>/g' /tmp/tcg-dumps/mysql/00-tcg.sql
```

(Trên cùng máy, `PUBLIC_HOST` cũng được vì host network; cross/group gọi nhau qua IP public của chính máy.)

**Không tắt server cũ lúc này** — bước 3 còn rsync dump từ nó, và nó là đường lùi nếu server mới trục trặc. Nếu muốn dữ liệu "đóng băng" (không ai chơi trong lúc chuyển), tắt game trước khi dump: `/h5/server/stop.sh` (script này **xoá log**).

---

## Bước 2 — Bootstrap server mới (10–20 phút)

**Ubuntu — trước bootstrap:** mở port cho client và kiểm tra compose plugin (`apt install docker.io` không kèm plugin):

```bash
ufw allow 9000/tcp && ufw allow 8001/tcp && ufw allow 12345/tcp && ufw allow 7788/tcp && ufw status numbered
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

Bắt buộc điền: `PUBLIC_HOST`, `TCG_SECRET`, `MYSQL_ROOT_PASSWORD`, `MONGO_PASSWORD`, `RABBITMQ_PASSWORD` (phải **khớp dump** — DB được tạo với đúng mật khẩu này), và các secret PHP. `ASSETS_DIR=/opt/tcg/assets` giữ nguyên. Heap giữ mặc định lần đầu.

Kiểm tra không còn ô trống bắt buộc:

```bash
grep -E '^(PUBLIC_HOST|TCG_SECRET|MYSQL_ROOT_PASSWORD|MONGO_PASSWORD|RABBITMQ_PASSWORD)=$' .env && echo "CON TRONG" || echo "OK"
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

Phải thấy `tcg stat web cdks game_s1` và Mongo có `tcg`, `statistic`, DB per-server. Nếu thiếu → dump chưa import (volume đã có từ lần chạy trước): `docker compose -f docker-compose.image.yml down -v` rồi làm lại bước 5.

Lên toàn bộ:

```bash
docker compose -f docker-compose.image.yml up -d
watch -n5 'docker compose -f docker-compose.image.yml ps'      # 5–8 phút, tất cả "healthy"
```

Thứ tự tự động: console → world → meta → statistic → pay → group → game → login → cross → php/nginx. Nếu một service **unhealthy** lâu, xem log của nó (bước 6) — service sau sẽ không lên cho tới khi nó healthy.

---

## Bước 6 — Kiểm tra (5 phút)

```bash
C="docker compose -f docker-compose.image.yml"
$C logs console   | grep -E 'Started|ERROR' | tail -3
$C logs game      | grep -E '找不到excel|找不到sheet|加载错误|OutOfMemory' ; echo "(rỗng = Excel đủ, heap đủ)"
$C logs group     | grep -iE 'OutOfMemory|GC overhead' ; echo "(rỗng = OK)"
$C logs game      | grep -m1 '游戏启动配置'              # in toàn bộ cấu hình đã resolve (wsPort, mongo, cross)
curl -s http://127.0.0.1:9999/status; echo
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
