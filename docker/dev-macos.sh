#!/usr/bin/env bash
#
# Chay thu TOAN BO he thong tren macOS (Docker Desktop) de xem/thu bang trinh duyet — ca cum Java
# that (console/world/meta/statistic/pay/group/game/login/cross), nen tang ID/Adapter/Admin, PHP.
# KHONG dung cho moi truong that — tren Linux dung docker compose (xem README.md).
#
# Vi sao can script rieng thay vi `docker compose up`:
#   Docker Desktop tren Mac: `network_mode: host` chi vao netns cua VM Linux, KHONG publish ra macOS,
#   va khong the publish mot cong ma container host-network dang giu. Cach vong: mot container
#   "op-net" giu netns va publish san moi cong; cac container khac join netns do
#   (`--network container:op-net`) nen van thay nhau qua 127.0.0.1, dong thoi Mac vao duoc.
#
# Du lieu: KHONG can dump tu server cu. MySQL nap bo seed sach docker/initdb/mysql/seed/ (zz-init.sh),
# Mongo trong (service tu tao collection). Moi lan chay la mot moi truong MOI (mat khau sinh moi,
# DB tao moi); `--down` xoa het. Muon giu du lieu cu: dat dump that vao docker/initdb/mysql/*.sql va
# docker/initdb/mongo/dump/ (gitignored) — zz-init.sh tu nhan ra.
#
# RAM: 9 JVM (tong heap ~5 GB) + MySQL/Mongo/MQ + 3 Go + PHP. Cap cho Docker Desktop >= 8 GB (nen 10).
#
# Dung:
#   ./dev-macos.sh            # dung stack (image phai co san)
#   ./dev-macos.sh --build    # dung lai image truoc roi chay
#   ./dev-macos.sh --down     # tat va xoa het container cua stack
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$REPO/docker/.dev-macos"          # gitignored: khoa ky + bi mat cua lan chay
CONTAINERS="op-net op-mysql op-mongo op-mq op-mail
            op-console op-world op-meta op-statistic op-pay op-group op-game op-login op-cross
            op-id op-adapter op-admin op-php op-nginx"

down() { docker rm -f $CONTAINERS >/dev/null 2>&1 || true; }

case "${1:-}" in
  --down) echo "Dang tat stack..."; down; echo "Xong."; exit 0 ;;
  --build)
    echo "==> Dung image tu ma nguon hien tai"
    for c in id adapter admin; do
      docker build -q -f "$REPO/platform/Dockerfile" --build-arg CMD="$c" \
        -t "op-h5-$c" "$REPO/platform" >/dev/null && echo "    op-h5-$c"
    done
    docker build -q -f "$REPO/docker/php/Dockerfile"    -t docker-php   "$REPO" >/dev/null && echo "    docker-php"
    docker build -q -f "$REPO/docker/Dockerfile.server" -t op-h5-server "$REPO" >/dev/null && echo "    op-h5-server"
    ;;
  "") : ;;
  *) echo "Tham so khong hieu: $1 (dung --build hoac --down)" >&2; exit 1 ;;
esac

for img in op-h5-id op-h5-adapter op-h5-admin docker-php op-h5-server; do
  docker image inspect "$img" >/dev/null 2>&1 || {
    echo "Thieu image $img — chay lai voi --build" >&2; exit 1; }
done

# openssl rand khong dung ong dan, nen khong dinh SIGPIPE voi `set -o pipefail`
# (`tr | head` va `tr | dd` deu lam tr bi giet khi ben nhan thoat som).
gen() { openssl rand -hex "${1:-16}"; }

mkdir -p "$STATE"

echo "==> 1/8 Don container cu"
down

echo "==> 2/8 Sinh bi mat cho lan chay nay"
MYSQL_PW=$(gen); TCG_SECRET=$(gen); INT_SECRET=$(gen)
# Khoa ma hoa game_secret: TAI DUNG giua cac lan chay (khong bat buoc vi DB cung moi, nhung vo hai).
[ -f "$STATE/enc.key" ] || openssl rand -base64 32 > "$STATE/enc.key"
chmod 600 "$STATE/enc.key"
ENC_KEY=$(cat "$STATE/enc.key")
ADMIN_PW=$(gen 16)
CONSOLE_PW=$(gen 16)     # zz-init.sh ghi vao tcg.staff (admin) — Adapter va GM tool dung
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
CONSOLE_ADMIN_PASSWORD=$CONSOLE_PW
ID_INTERNAL_SECRET=$INT_SECRET
ADAPTER_SECRET_ENC_KEY=$ENC_KEY
GM_CODE=$GM_CODE
GMHANGLONG_CODE=$GMHANGLONG_CODE
REV_QUERY_KEY=$REV_KEY
EOF
chmod 600 "$STATE/creds.txt"

# Client hardcode so cong (12345 meta, 7788 statistic, 9000 login, 8001+ game WS) nen
# phai publish DUNG cac so do, khong doi duoc.
echo "==> 3/8 Container giu netns (publish cong ra macOS)"
docker run -d --name op-net --restart unless-stopped \
  -p 127.0.0.1:8080:80    -p 127.0.0.1:8081:8081 \
  -p 127.0.0.1:8100:8100  -p 127.0.0.1:8025:8025 \
  -p 127.0.0.1:12345:12345 -p 127.0.0.1:7788:7788 \
  -p 127.0.0.1:9000:9000  -p 127.0.0.1:9999:9999 \
  -p 127.0.0.1:8001:8001  -p 127.0.0.1:8002:8002 -p 127.0.0.1:8003:8003 \
  alpine:3.19 sleep infinity >/dev/null
NET="container:op-net"

# Doi mot cong TCP trong netns chung mo ra (probe tu op-console vi image co bash + /dev/tcp).
wait_port() { # $1 ten  $2 port  $3 timeout giay
  local t=0
  until docker exec op-console bash -c "exec 3<>/dev/tcp/127.0.0.1/$2" >/dev/null 2>&1; do
    t=$((t + 5)); [ "$t" -lt "$3" ] || { echo "    !! $1 (:$2) khong len sau $3s — docker logs op-$1" >&2; return 1; }
    sleep 5
  done
  echo "    $1 :$2 san sang (${t}s)"
}

echo "==> 4/8 MySQL (seed sach + zz-init.sh), MongoDB, RabbitMQ, Mailpit"
# initdb duoc CHEP vao container chu khong bind mount.
#
# Vi sao: entrypoint cua image mysql chay file *.sh neu no co bit thuc thi, con khong
# thi source. Bind mount cua Docker Desktop tren macOS trinh dien MOI file la 0777 —
# ke ca khi tren dia la 0644 — nen entrypoint chon nhanh "chay"; nhung chinh mount do
# lai la noexec, thanh ra "/bin/bash: bad interpreter: Permission denied" va container
# chet voi ma 126 truoc khi nap duoc seed.
#
# `docker cp` giu nguyen mode cua host (0644) nen entrypoint source dung nhu zz-init.sh
# duoc thiet ke — no can ham docker_process_sql cua image, ham nay chi ton tai khi source.
# Tren Linux (docker-compose.yml) bind mount giu dung mode nen khong dinh; chi doi o day.
docker create --name op-mysql --network "$NET" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_PW" -e TZ=Asia/Ho_Chi_Minh \
  -e MONGO_USER=abc123 -e MONGO_PASSWORD="$MYSQL_PW" \
  -e RABBITMQ_USER=admin -e RABBITMQ_PASSWORD="$MYSQL_PW" \
  -e CONSOLE_ADMIN_PASSWORD="$CONSOLE_PW" -e PUBLIC_HOST=127.0.0.1 -e GAME_SERVERS=s1:8001:d1 \
  -v "$REPO/docker/mysql/tcg.cnf:/etc/mysql/conf.d/tcg.cnf:ro" \
  mysql:8.0 --defaults-extra-file=/etc/mysql/conf.d/tcg.cnf >/dev/null
docker cp "$REPO/docker/initdb/mysql/." op-mysql:/docker-entrypoint-initdb.d/ >/dev/null
docker start op-mysql >/dev/null
docker run -d --name op-mongo --network "$NET" \
  -e MONGO_INITDB_ROOT_USERNAME=abc123 -e MONGO_INITDB_ROOT_PASSWORD="$MYSQL_PW" \
  -v "$REPO/docker/initdb/mongo:/docker-entrypoint-initdb.d:ro" \
  mongo:4.4 mongod --bind_ip 127.0.0.1 --auth --wiredTigerCacheSizeGB 0.25 >/dev/null
docker run -d --name op-mq --network "$NET" \
  -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS="$MYSQL_PW" \
  rabbitmq:3.12-management-alpine >/dev/null
docker run -d --name op-mail --network "$NET" axllent/mailpit:latest >/dev/null

# mysqladmin ping chi thanh cong khi server THAT len (luc init, server tam chi nghe socket) ->
# ping duoc = seed + zz-init.sh da xong.
for _ in $(seq 1 60); do
  docker exec op-mysql mysqladmin ping -h127.0.0.1 -uroot -p"$MYSQL_PW" --silent >/dev/null 2>&1 && break
  sleep 3
done
docker logs op-mysql 2>&1 | grep -E '^\[tcg-init\]' | sed 's/^/    /' || true
docker exec op-mysql mysql -uroot -p"$MYSQL_PW" -N -e "SELECT CONCAT('    tcg.srv_game: ', code, ' ws=', ws_port) FROM tcg.srv_game" 2>/dev/null \
  || { echo "    !! khong co tcg.srv_game — xem: docker logs op-mysql" >&2; exit 1; }
docker exec op-mysql mysql -uroot -p"$MYSQL_PW" -e "CREATE DATABASE IF NOT EXISTS platform CHARACTER SET utf8mb4;" 2>/dev/null

# server-entrypoint dien secret vao layer container, KHONG sua cay nguon.
java_svc() { # $1=ten  $2=thu muc  $3=jar  $4=xmx  [$5...=tham so them]
  local name=$1 dir=$2 jar=$3 xmx=$4; shift 4
  docker run -d --name "op-$name" --network "$NET" -w "/h5/server/$dir" \
    -e TCG_SECRET="$TCG_SECRET" -e MYSQL_ROOT_PASSWORD="$MYSQL_PW" \
    -e MONGO_PASSWORD="$MYSQL_PW" -e RABBITMQ_PASSWORD="$MYSQL_PW" \
    -e PUBLIC_HOST=127.0.0.1 \
    op-h5-server java -Xms128m -Xmx"$xmx" -jar "$jar" "$@" >/dev/null
}

echo "==> 5/8 Cum Java that, dung thu tu start.sh goc: console -> world -> meta -> statistic -> pay -> group -> game -> login -> cross"
java_svc console console tcg-console-server-0.0.1-SNAPSHOT.jar 512m
for _ in $(seq 1 40); do
  docker exec op-console curl -sf -m 3 http://127.0.0.1:9999/conf/global/get >/dev/null 2>&1 && break
  sleep 3
done
echo "    console :9999 san sang"
java_svc world     world     tcg-world-server-0.0.1-SNAPSHOT.jar 640m;  wait_port world 10086 180
java_svc meta      meta      tcg-meta-0.0.1-SNAPSHOT.jar         320m
java_svc statistic statistic tcg-stat-server-0.0.1-SNAPSHOT.jar  512m;  wait_port statistic 7788 180
java_svc pay       pay       tcg-pay-server-0.0.1-SNAPSHOT.jar   384m;  wait_port pay 10010 180
# group can nhieu heap hon cac service khac: SrvGroupDeviceEntity.jvmArgs trong DB ghi
# -Xmx1128m, va o 640m no chet ngay luc khoi dong ("OutOfMemoryError: Java heap space",
# dung nhu CLAUDE.md muc 11.2 mo ta). Cap 1152m cho khop cau hinh goc.
java_svc group     group     tcg-group.jar 1152m --v=0 --gc=group-offical --p=30001;  wait_port group 30001 180
java_svc game      game      tcg-game.jar  1024m --v=0 --sc=s1;                     wait_port game 8001 300
java_svc login     login     tcg-login-server-0.0.1-SNAPSHOT.jar 320m;              wait_port login 9000 180
# cross giong group: SrvCrossEntity.jvmArgs trong DB ghi -Xmx1128m, o 640m no chet ngay
# luc khoi dong ("OutOfMemoryError: Java heap space"). Do thuc te: ca cum dung ~2,3 GiB
# tren 7,75 GiB nen tran cao hon khong gay ap luc — day chi la muc dat truoc.
java_svc cross     cross     tcg-cross.jar 1152m --v=0 --cc=cross-yzx1 --p=20001;    wait_port cross 20001 180

echo "==> 6/8 He thong ID, Adapter, trang quan tri"
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

echo "==> 7/8 Seed DB platform (cung script voi server that: oauth_clients, games, game_servers tu tcg.srv_game, 1962 goi)"
docker run --rm --network "$NET" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_PW" -e ADAPTER_REDIRECT_URI="http://127.0.0.1:8080/auth/callback" \
  -e ADAPTER_SITE_URL="http://127.0.0.1:8080" -e GAME_SERVERS=s1:8001:d1 -e SEED_WAIT_SECONDS=120 \
  -v "$REPO/docker/platform-seed.sh:/seed/platform-seed.sh:ro" \
  -v "$REPO/docker/platform-seed:/seed/data:ro" \
  mysql:8.0 bash /seed/platform-seed.sh | sed 's/^/    /'

docker run -d --name op-adapter --network "$NET" \
  -e ADAPTER_ADDR=":8090" -e ADAPTER_GAME_CODE=haitac \
  -e ID_DB_PASSWORD="$MYSQL_PW" -e ID_DB_NAME=platform \
  -e ADAPTER_ISSUER="http://127.0.0.1:8081" -e ADAPTER_CLIENT_ID=haitac \
  -e ADAPTER_REDIRECT_URI="http://127.0.0.1:8080/auth/callback" \
  -e ADAPTER_LOGIN_BASE_URL="http://127.0.0.1:9000" -e TCG_SECRET="$TCG_SECRET" \
  -e ADAPTER_SECRET_ENC_KEY="$ENC_KEY" \
  -e ADAPTER_CONSOLE_BASE_URL="http://127.0.0.1:9999" \
  -e ADAPTER_CONSOLE_USER=admin -e ADAPTER_CONSOLE_PASSWORD="$CONSOLE_PW" \
  # develop = ma platform duy nhat con bat dang nhap username+mat khau tren login server.
  -e ADAPTER_PLATFORM_CODE=develop -e ADAPTER_CHANNEL_CODE=0 \
  -e ADAPTER_PUBLIC_HOST="127.0.0.1" -e ADAPTER_POLL_INTERVAL=3s -e ADAPTER_GRANT_INTERVAL=5s \
  op-h5-adapter >/dev/null

docker run -d --name op-admin --network "$NET" \
  -e ADMIN_ADDR=":8100" -e ID_DB_PASSWORD="$MYSQL_PW" -e ID_DB_NAME=platform \
  -e ADMIN_COOKIE_SECURE=false \
  -e ADMIN_BOOTSTRAP_USER=quantri -e ADMIN_BOOTSTRAP_PASSWORD="$ADMIN_PW" \
  op-h5-admin >/dev/null

echo "==> 8/8 php-fpm + nginx"
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
  -v "$REPO/docker/nginx/game_site.conf:/etc/nginx/game_site.conf:ro" \
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
printf "  %-32s %s\n" "http://127.0.0.1:8080"          "Trang chinh haitac (/may-chu, /quy-doi, /choi-game)"
printf "  %-32s %s\n" "http://127.0.0.1:8080/play.php" "Client game (may chu s1, WebSocket :8001)"
printf "  %-32s %s\n" "http://127.0.0.1:8081"          "Cong game — dang ky / tai khoan / quen mat khau"
printf "  %-32s %s\n" "http://127.0.0.1:8100"          "Trang quan tri"
printf "  %-32s %s\n" "http://127.0.0.1:8025"          "Hop thu (email dat lai mat khau)"
echo
echo "  Quan tri: quantri / $ADMIN_PW"
echo "  Console :9999 (GM tool): admin / $CONSOLE_PW"
echo "  Bi mat khac: $STATE/creds.txt"
echo
echo "  Log game:  docker exec op-game tail -f .logs/game-s1/info.log"
echo "  Loi excel: docker exec op-game grep -E '找不到excel|加载错误' .logs/game-s1/info.log"
echo "  Tat het:   ./dev-macos.sh --down"
