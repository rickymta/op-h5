#!/usr/bin/env bash
#
# Chay thu toan bo he thong tren macOS de xem/thu bang trinh duyet.
# KHONG dung cho moi truong that — tren Linux hay dung docker compose (xem README.md).
#
# Vi sao can script rieng thay vi `docker compose up`:
#
#   1. Docker Desktop tren Mac: `network_mode: host` chi vao netns cua VM Linux, KHONG
#      publish ra macOS, va khong the publish mot cong ma container host-network dang
#      giu. Cach vong: mot container "op-net" giu netns va publish san moi cong; cac
#      container khac join netns do (`--network container:op-net`) nen van thay nhau
#      qua 127.0.0.1, dong thoi Mac vao duoc. Tren Ubuntu that khong can buoc nay.
#
#   2. Chua co dump MySQL `tcg` tu server cu, nen:
#        - console, world, meta, statistic  -> chay JAR THAT, khoi dong duoc voi `tcg` RONG
#        - login                            -> ban gia (cmd/fakelogin), vi ban that doc
#                                              tcg.srv_game va tcg.account de tra danh
#                                              sach may chu va xac thuc
#        - game, group, cross               -> KHONG chay duoc: chung doc srv_game /
#                                              srv_group_device de biet minh la ai
#      Hau qua: client vao duoc toi man hinh dang nhap va thay danh sach may chu, nhung
#      bam vao may chu thi khong noi duoc WebSocket (:8001) vi khong co tien trinh game.
#
# Dung:
#   ./dev-macos.sh            # dung stack (image phai co san)
#   ./dev-macos.sh --build    # dung lai image truoc roi chay
#   ./dev-macos.sh --down     # tat va xoa het container cua stack
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$REPO/docker/.dev-macos"          # gitignored: khoa ky + bi mat cua lan chay
CONTAINERS="op-net op-mysql op-mongo op-mq op-mail op-console op-world op-meta
            op-statistic op-fake op-id op-adapter op-admin op-php op-nginx"

down() { docker rm -f $CONTAINERS >/dev/null 2>&1 || true; }

case "${1:-}" in
  --down) echo "Dang tat stack..."; down; echo "Xong."; exit 0 ;;
  --build)
    echo "==> Dung image tu ma nguon hien tai"
    for c in id adapter admin fakelogin; do
      docker build -q -f "$REPO/platform/Dockerfile" --build-arg CMD="$c" \
        -t "op-h5-$c" "$REPO/platform" >/dev/null && echo "    op-h5-$c"
    done
    docker build -q -f "$REPO/docker/php/Dockerfile"    -t docker-php   "$REPO" >/dev/null && echo "    docker-php"
    docker build -q -f "$REPO/docker/Dockerfile.server" -t op-h5-server "$REPO" >/dev/null && echo "    op-h5-server"
    ;;
  "") : ;;
  *) echo "Tham so khong hieu: $1 (dung --build hoac --down)" >&2; exit 1 ;;
esac

for img in op-h5-id op-h5-adapter op-h5-admin op-h5-fakelogin docker-php op-h5-server; do
  docker image inspect "$img" >/dev/null 2>&1 || {
    echo "Thieu image $img — chay lai voi --build" >&2; exit 1; }
done

# openssl rand khong dung ong dan, nen khong dinh SIGPIPE voi `set -o pipefail`
# (`tr | head` va `tr | dd` deu lam tr bi giet khi ben nhan thoat som).
gen() { openssl rand -hex "${1:-16}"; }

mkdir -p "$STATE"

echo "==> 1/9 Don container cu"
down

echo "==> 2/9 Sinh bi mat cho lan chay nay"
MYSQL_PW=$(gen); TCG_SECRET=$(gen); INT_SECRET=$(gen)
ENC_KEY=$(openssl rand -base64 32)
ADMIN_PW=$(gen 16)
CONSOLE_PW=$(gen 16)
# Ma uy quyen cua tang PHP cu (gm/, gmhanglong/, adminphp@2024/). Phai sinh o day:
# thieu bien nao thi web-entrypoint de nguyen placeholder, va vi PHP dat error_reporting(0)
# nen trang tuong ung chi tra 200 RONG chu khong bao loi.
GM_CODE=$(gen 8); GMHANGLONG_CODE=$(gen 8); REV_KEY=$(gen 8)
[ -f "$STATE/id-signing.pem" ] || openssl genrsa -out "$STATE/id-signing.pem" 2048 2>/dev/null
cat > "$STATE/creds.txt" <<EOF
MYSQL_ROOT_PASSWORD=$MYSQL_PW
MONGO_PASSWORD=$MYSQL_PW
RABBITMQ_PASSWORD=$MYSQL_PW
TCG_SECRET=$TCG_SECRET
ADMIN_BOOTSTRAP_USER=quantri
ADMIN_BOOTSTRAP_PASSWORD=$ADMIN_PW
CONSOLE_PASSWORD=$CONSOLE_PW
ID_INTERNAL_SECRET=$INT_SECRET
GM_CODE=$GM_CODE
GMHANGLONG_CODE=$GMHANGLONG_CODE
REV_QUERY_KEY=$REV_KEY
EOF
chmod 600 "$STATE/creds.txt"

# Client hardcode so cong (12345 meta, 7788 statistic, 9000 login, 8001+ game WS) nen
# phai publish DUNG cac so do, khong doi duoc.
echo "==> 3/9 Container giu netns (publish cong ra macOS)"
docker run -d --name op-net --restart unless-stopped \
  -p 127.0.0.1:8080:80    -p 127.0.0.1:8081:8081 \
  -p 127.0.0.1:8100:8100  -p 127.0.0.1:8025:8025 \
  -p 127.0.0.1:12345:12345 -p 127.0.0.1:7788:7788 \
  -p 127.0.0.1:9000:9000  -p 127.0.0.1:9999:9999 \
  -p 127.0.0.1:8001:8001  -p 127.0.0.1:8002:8002 -p 127.0.0.1:8003:8003 \
  alpine:3.19 sleep infinity >/dev/null
NET="container:op-net"

echo "==> 4/9 MySQL, MongoDB, RabbitMQ, Mailpit"
docker run -d --name op-mysql --network "$NET" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_PW" -e TZ=Asia/Ho_Chi_Minh mysql:8.0 >/dev/null
docker run -d --name op-mongo --network "$NET" \
  -e MONGO_INITDB_ROOT_USERNAME=abc123 -e MONGO_INITDB_ROOT_PASSWORD="$MYSQL_PW" \
  mongo:4.4 mongod --bind_ip 127.0.0.1 --auth --wiredTigerCacheSizeGB 0.25 >/dev/null
docker run -d --name op-mq --network "$NET" \
  -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS="$MYSQL_PW" \
  rabbitmq:3.12-management-alpine >/dev/null
docker run -d --name op-mail --network "$NET" axllent/mailpit:latest >/dev/null

for _ in $(seq 1 40); do
  docker exec op-mysql mysqladmin ping -h127.0.0.1 -uroot -p"$MYSQL_PW" --silent >/dev/null 2>&1 && break
  sleep 3
done

echo "==> 5/9 Tao database (rong — chua co dump tu server cu)"
docker exec op-mysql mysql -uroot -p"$MYSQL_PW" -e "
  CREATE DATABASE IF NOT EXISTS platform CHARACTER SET utf8mb4;
  CREATE DATABASE IF NOT EXISTS web  CHARACTER SET utf8mb4;
  CREATE DATABASE IF NOT EXISTS tcg  CHARACTER SET utf8mb4;
  CREATE DATABASE IF NOT EXISTS stat CHARACTER SET utf8mb4;
  CREATE DATABASE IF NOT EXISTS cdks CHARACTER SET utf8mb4;" 2>/dev/null
# Bang toi thieu cua `web` de callback thanh toan chay duoc (dump that se ghi de).
docker exec -i op-mysql mysql -uroot -p"$MYSQL_PW" --default-character-set=utf8mb4 web 2>/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS user (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(64) UNIQUE,
  password VARCHAR(255), email VARCHAR(128), phone VARCHAR(32), ip VARCHAR(64),
  xu BIGINT DEFAULT 0, time DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS card_log (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(64),
  task_id VARCHAR(64), seri VARCHAR(64), pin VARCHAR(64), reqid VARCHAR(64),
  phuongthuc VARCHAR(32), status VARCHAR(32), menhgia BIGINT, date DATETIME DEFAULT CURRENT_TIMESTAMP);
SQL

# server-entrypoint dien secret vao layer container, KHONG sua cay nguon.
java_svc() { # $1=ten  $2=thu muc  $3=jar  $4=xmx
  docker run -d --name "op-$1" --network "$NET" -w "/h5/server/$2" \
    -e TCG_SECRET="$TCG_SECRET" -e MYSQL_ROOT_PASSWORD="$MYSQL_PW" \
    -e MONGO_PASSWORD="$MYSQL_PW" -e RABBITMQ_PASSWORD="$MYSQL_PW" \
    -e PUBLIC_HOST=127.0.0.1 \
    op-h5-server java -Xms128m -Xmx"$4" -jar "$3" >/dev/null
}

echo "==> 6/9 Cum Java that: console -> world -> meta -> statistic"
java_svc console console tcg-console-server-0.0.1-SNAPSHOT.jar 512m
for _ in $(seq 1 30); do
  docker exec op-console curl -sf -m 3 http://127.0.0.1:9999/conf/global/get >/dev/null 2>&1 && break
  sleep 3
done
java_svc world     world     tcg-world-server-0.0.1-SNAPSHOT.jar 640m
sleep 25
java_svc meta      meta      tcg-meta-0.0.1-SNAPSHOT.jar         320m
java_svc statistic statistic tcg-stat-server-0.0.1-SNAPSHOT.jar  512m
sleep 25

echo "==> 7/9 Login gia (:9000) + console gia (:9998)"
# Console THAT giu :9999 (client goi /status). Console gia o :9998 de Adapter phat
# vat pham, vi console that khong phat duoc khi thieu schema `tcg`.
docker run -d --name op-fake --network "$NET" op-h5-fakelogin \
  -addr :9000 -secret "$TCG_SECRET" \
  -servers "s1:8001:180,s2:8002:640,s3:8003:20" \
  -console-addr :9998 -console-user admin -console-pass "$CONSOLE_PW" >/dev/null

echo "==> 8/9 He thong ID, Adapter, trang quan tri"
# ID nghe DUNG cong ma trinh duyet dung (8081): issuer phai la mot dia chi giai duoc ca
# tu trinh duyet lan tu ben trong netns (Adapter goi discovery va doi token).
docker run -d --name op-id --network "$NET" \
  -e ID_ADDR=":8081" -e ID_ISSUER="http://127.0.0.1:8081" \
  -e ID_DB_PASSWORD="$MYSQL_PW" -e ID_DB_NAME=platform \
  -e ID_SIGNING_KEY_PEM="$(cat "$STATE/id-signing.pem")" -e ID_COOKIE_SECURE=false \
  -e ID_INTERNAL_SECRET="$INT_SECRET" \
  -e ID_SMTP_HOST=127.0.0.1 -e ID_SMTP_PORT=1025 -e ID_SMTP_FROM="no-reply@conggame.test" \
  op-h5-id >/dev/null
for _ in $(seq 1 30); do
  docker exec op-id wget -qO- http://127.0.0.1:8081/healthz >/dev/null 2>&1 && break
  sleep 2
done

# Seed mau. Tren server that, docker/platform-seed.sh doc tu tcg.srv_game.
docker exec -i op-mysql mysql -uroot -p"$MYSQL_PW" --default-character-set=utf8mb4 platform 2>/dev/null <<'SQL'
INSERT INTO oauth_clients (client_id,name,secret_hash,redirect_uris,scopes,require_pkce)
VALUES ('haitac','Đại Hải Trình',NULL,'http://127.0.0.1:8080/auth/callback','openid profile wallet',1)
ON DUPLICATE KEY UPDATE redirect_uris=VALUES(redirect_uris);
INSERT INTO games (code,name,adapter_url,site_url,sort_order)
VALUES ('haitac','Đại Hải Trình','http://127.0.0.1:8090','http://127.0.0.1:8080',1)
ON DUPLICATE KEY UPDATE adapter_url=VALUES(adapter_url), site_url=VALUES(site_url);
INSERT INTO game_devices (game_code,device_code,name,max_online)
VALUES ('haitac','host-01','Máy 01',5000) ON DUPLICATE KEY UPDATE max_online=VALUES(max_online);
INSERT INTO game_servers (game_code,srv_code,name,device_code,ws_port,soft_limit,overflow_pct,recommend,status) VALUES
 ('haitac','s1','Vùng Đất Vô Danh','host-01',8001,500,15,1,'running'),
 ('haitac','s2','Đảo Sương Mù','host-01',8002,500,15,1,'running'),
 ('haitac','s3','Vịnh Cá Voi','host-01',8003,500,15,1,'running')
ON DUPLICATE KEY UPDATE name=VALUES(name), soft_limit=VALUES(soft_limit);
INSERT INTO game_packages (game_code,package_id,name,price_xu,item_tid,item_count,item_name,sort_order) VALUES
 ('haitac','goi-60','Gói 60',60000,1001,60,'Kim nguyên bảo',1),
 ('haitac','goi-300','Gói 300',300000,1001,300,'Kim nguyên bảo',2),
 ('haitac','goi-1000','Gói 1000',1000000,1001,1000,'Kim nguyên bảo',3),
 ('haitac','goi-3000','Gói 3000',3000000,1001,3000,'Kim nguyên bảo',4)
ON DUPLICATE KEY UPDATE price_xu=VALUES(price_xu);
SQL

docker run -d --name op-adapter --network "$NET" \
  -e ADAPTER_ADDR=":8090" -e ADAPTER_GAME_CODE=haitac \
  -e ID_DB_PASSWORD="$MYSQL_PW" -e ID_DB_NAME=platform \
  -e ADAPTER_ISSUER="http://127.0.0.1:8081" -e ADAPTER_CLIENT_ID=haitac \
  -e ADAPTER_REDIRECT_URI="http://127.0.0.1:8080/auth/callback" \
  -e ADAPTER_LOGIN_BASE_URL="http://127.0.0.1:9000" -e TCG_SECRET="$TCG_SECRET" \
  -e ADAPTER_SECRET_ENC_KEY="$ENC_KEY" \
  -e ADAPTER_CONSOLE_BASE_URL="http://127.0.0.1:9998" \
  -e ADAPTER_CONSOLE_USER=admin -e ADAPTER_CONSOLE_PASSWORD="$CONSOLE_PW" \
  -e ADAPTER_PUBLIC_HOST="127.0.0.1" -e ADAPTER_POLL_INTERVAL=3s -e ADAPTER_GRANT_INTERVAL=5s \
  op-h5-adapter >/dev/null

docker run -d --name op-admin --network "$NET" \
  -e ADMIN_ADDR=":8100" -e ID_DB_PASSWORD="$MYSQL_PW" -e ID_DB_NAME=platform \
  -e ADMIN_COOKIE_SECURE=false \
  -e ADMIN_BOOTSTRAP_USER=quantri -e ADMIN_BOOTSTRAP_PASSWORD="$ADMIN_PW" \
  op-h5-admin >/dev/null

echo "==> 9/9 php-fpm + nginx"
# CANH BAO: web-entrypoint sed thang vao cay nguon (bind mount), thay 192.168.1.69
# bang PUBLIC_HOST trong 3 file. Do chinh la ly do client goi 127.0.0.1:12345.
# Xong viec: git checkout -- website/game/ && rm -f website/game/.public-host
docker run -d --name op-php --network "$NET" \
  -e PUBLIC_HOST=127.0.0.1 -e MYSQL_ROOT_PASSWORD="$MYSQL_PW" \
  -e ID_BASE_URL="http://127.0.0.1:8081" -e ID_INTERNAL_SECRET="$INT_SECRET" \
  -e ID_WALLET_ENABLED=1 -e ADAPTER_BASE_URL="http://127.0.0.1:8090" \
  -e CONSOLE_ADMIN_PASSWORD="$CONSOLE_PW" \
  -e GM_CODE="$GM_CODE" -e GMHANGLONG_CODE="$GMHANGLONG_CODE" -e REV_QUERY_KEY="$REV_KEY" \
  -v "$REPO/website/game:/www/wwwroot/game" docker-php >/dev/null
docker run -d --name op-nginx --network "$NET" \
  -v "$REPO/website/game:/www/wwwroot/game:ro" \
  -v "$REPO/docker/nginx/game.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$REPO/docker/nginx/adapter_proxy.conf:/etc/nginx/adapter_proxy.conf:ro" \
  nginx:1.25-alpine >/dev/null

sleep 8

echo
echo "==================== TRANG THAI ===================="
for c in $CONTAINERS; do
  printf "  %-13s %s\n" "$c" "$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo 'khong co')"
done

echo
echo "==================== TRUY CAP ====================="
printf "  %-32s %s\n" "http://127.0.0.1:8080"          "Trang chinh haitac (/may-chu, /quy-doi)"
printf "  %-32s %s\n" "http://127.0.0.1:8080/play.php" "Client game"
printf "  %-32s %s\n" "http://127.0.0.1:8081"          "Cong game — dang ky / tai khoan / quen mat khau"
printf "  %-32s %s\n" "http://127.0.0.1:8100"          "Trang quan tri"
printf "  %-32s %s\n" "http://127.0.0.1:8025"          "Hop thu (email dat lai mat khau)"
echo
echo "  Quan tri: quantri / $ADMIN_PW"
echo "  Bi mat khac: $STATE/creds.txt"
echo
echo "  Client tu goi: :12345 meta · :7788 statistic · :9000 login · :9999 console"
echo "  CHUA chay: game/group/cross (:8001+) — can dump tcg.srv_game tu server cu."
echo "  Tat het:  ./dev-macos.sh --down"
