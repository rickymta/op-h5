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

## 2. Chuẩn bị trên server cũ (pgaming)

Không JAR nào chứa schema của `tcg`/`stat`/`web`/`cdks` hay Mongo (chỉ `tcg-game.jar` có 4 bảng `stat_*`). **Bắt buộc dump từ server đang chạy:**

```bash
export MYSQL_PW='...' MONGO_PW='...'
bash prepare-dumps.sh          # -> /tmp/tcg-dumps/{mysql/*.sql, mongo/dump/}
```

Đồng thời tắt game cũ khi cắt chuyển: `/h5/server/stop.sh` (lưu ý script này **xoá log**).

## 3. Chuẩn bị trên máy Docker

Yêu cầu: Docker Engine 24+ và plugin `docker compose` v2 trên Linux.

```bash
# 1. Cây thư mục: /opt/tcg/{server,website,docker}  (đường dẫn tuỳ, chỉnh SERVER_DIR/WEBSITE_DIR trong .env)
#    server/ là bản đã vá (JAR patched + Excel tên tiếng Anh + 5 file tái tạo + 6 sheet bổ sung)
# 2. Dump
cp /path/tcg-dumps/mysql/*.sql   docker/initdb/mysql/
cp -r /path/tcg-dumps/mongo/dump docker/initdb/mongo/
chmod +x docker/initdb/mongo/restore.sh docker/prepare-dumps.sh
# 3. Cấu hình
cd docker && cp .env.example .env && nano .env      # 3 mật khẩu phải KHỚP với env.yml / global.conf.json
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
curl -s http://127.0.0.1:9999/status; echo
curl -sI http://127.0.0.1/play-game | head -1              # 200 = nginx + php ok
docker stats --no-stream                                   # đo RAM thật, chỉnh .env
```

Nạp lại Excel nóng sau khi sửa: `curl -X POST http://127.0.0.1:9999/srv/game/cmd/excel/reload` (cần `Login-Token` từ `POST /staff/login`).

## 6. Vận hành

```bash
docker compose restart game            # 1 service
docker compose down                    # dừng hết, giữ volume
docker compose down -v                 # XOÁ CẢ DB — chỉ khi muốn import lại dump
docker compose logs -f --tail=200 cross
```

Backup định kỳ (SSD 40 GB — giữ 3 bản):

```bash
docker compose exec -T mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --all-databases --single-transaction | gzip > /backup/mysql-$(date +%F).sql.gz
docker compose exec -T mongo mongodump --archive -u abc123 -p "$MONGO_PASSWORD" --authenticationDatabase admin | gzip > /backup/mongo-$(date +%F).gz
```

## 7. Những gì chưa chắc — đọc trước lần `up` đầu

1. **nginx rewrite là suy đoán.** File nginx gốc không có trong snapshot; `nginx/game.conf` dựng từ mã PHP. 4 endpoint `/user/login.php|register.php|email.php|quenmatkhau.php` được map tạm về `api/config.php?act=…` — kiểm tra đăng nhập/đăng ký web ngay sau khi lên.
2. **Heap là ước lượng.** Không có số đo steady-state từ server cũ. Bộ số mặc định để *khởi động được* trên 8 GB; chỉnh theo `docker stats`.
3. **Chưa từng `up` thật.** Máy chuẩn bị bộ này không có Docker; chỉ lint được cú pháp compose.
4. **`cross` gọi group/game qua `192.168.1.69:20001`/`30001`** (giá trị trong `tcg.srv_cross.url`, `srv_group_device.url`). Với host network và IP đã đổi, cập nhật 2 cột `url` đó trong DB hoặc qua console `/srv/cross/update`, `/srv/group/conf/update`.
5. Thời điểm thay JAR mới từ nhà phát hành: chạy lại `python tools/patch-excel-names.py --apply`, nếu không bytecode quay về tìm tên Excel tiếng Trung.
