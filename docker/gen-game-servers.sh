#!/usr/bin/env bash
# Sinh docker-compose.game.yml tu danh sach server trong .env.
#
# Vi sao can bo sinh: Compose khong co vong lap, va `--scale` khong dung duoc o day vi
# moi game server can mot --sc rieng va mot wsPort rieng. Sua compose bang tay moi lan
# mo server la duong de sai port.
#
#   GAME_SERVERS=s1:8001:host-01,s2:8002:host-01,s3:8003:host-02
#                 ^   ^     ^
#                 |   |     device_code — may vat ly, phai khop tcg.srv_game.device_code
#                 |   wsPort — HTTP noi bo cua tien trinh game LUON la wsPort + 10000
#                 srvCode — khop dong trong tcg.srv_game
#
# Chay:  ./gen-game-servers.sh          -> in ra man hinh
#        ./gen-game-servers.sh --write  -> ghi docker-compose.game.yml
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "khong tim thay .env (copy tu .env.example)" >&2; exit 1; }
# shellcheck disable=SC1091
set -a; . ./.env; set +a

SPEC="${GAME_SERVERS:-s1:8001:host-01}"
OUT=docker-compose.game.yml

# --- kiem tra truoc khi sinh: trung srvCode hoac trung port la loi im lang kho lan ---
# Dung chuoi thay vi mang ket hop de chay duoc ca tren bash 3.2 (mac dinh cua macOS).
seen_codes=" "
seen_ports=" "
for entry in ${SPEC//,/ }; do
  IFS=':' read -r code port device <<<"$entry"
  [ -n "$code" ] && [ -n "$port" ] && [ -n "$device" ] || {
    echo "muc '$entry' sai dinh dang, can srvCode:wsPort:deviceCode" >&2; exit 1; }
  case "$port" in ''|*[!0-9]*) echo "wsPort cua $code khong phai so: $port" >&2; exit 1;; esac
  case "$seen_codes" in *" $code "*) echo "srvCode '$code' bi lap" >&2; exit 1;; esac
  case "$seen_ports" in *" $port "*) echo "port $port bi lap — kiem tra lai GAME_SERVERS" >&2; exit 1;; esac
  # HTTP noi bo = wsPort + 10000, nen wsPort cua server nay khong duoc trung HTTP cua server kia.
  http=$((port + 10000))
  case "$seen_ports" in *" $http "*) echo "port $http (HTTP cua $code) bi lap" >&2; exit 1;; esac
  seen_codes="$seen_codes$code "
  seen_ports="$seen_ports$port $http "
done

gen() {
  cat <<'HEADER'
# SINH TU DONG boi gen-game-servers.sh — dung sua tay.
# Sua GAME_SERVERS trong .env roi chay lai: ./gen-game-servers.sh --write
#
# Dung kem file chinh:
#   docker compose -f docker-compose.yml -f docker-compose.game.yml up -d
#
# File nay TU CHUA (khong dung `<<: *java`) vi YAML anchor khong bang qua duoc
# ranh gioi file trong Compose — anchor duoc phan giai luc doc tung file mot.
#
# Cac game server ngang hang nhau: chung chi can `group` san sang nen len song song duoc.
# `login` phai len SAU tat ca de danh sach server day du ngay tu nhip heartbeat dau tien.
services:

  # Service `game` mac dinh trong docker-compose.yml da duoc thay bang cac game-<srvCode>
  # ben duoi. Gan profile khong bao gio bat de no khong khoi dong.
  game:
    profiles: ["vo-hieu-hoa"]
HEADER

  for entry in ${SPEC//,/ }; do
    IFS=':' read -r code port device <<<"$entry"
    cat <<EOF

  game-${code}:
    image: eclipse-temurin:8-jre-jammy
    network_mode: host
    restart: unless-stopped
    working_dir: /h5/server/game
    environment:
      TZ: Asia/Ho_Chi_Minh
      JAVA_TOOL_OPTIONS: >-
        -XX:+UseSerialGC -XX:MaxMetaspaceSize=160m -XX:ReservedCodeCacheSize=48m
        -Xss512k -XX:MinHeapFreeRatio=10 -XX:MaxHeapFreeRatio=25
        -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom
        -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Ho_Chi_Minh
    volumes:
      - \${SERVER_DIR:-../server}:/h5/server
    # device_code = ${device}; HTTP noi bo cua tien trinh nay = $((port + 10000))
    command: ["java", "-Xms256m", "-Xmx\${JAVA_XMX_GAME:-1024m}", "-jar", "tcg-game.jar", "--v=0", "--sc=${code}"]
    mem_limit: 1400m
    mem_reservation: 768m
    cpu_shares: 1024
    depends_on:
      group: { condition: service_healthy }
    healthcheck:
      interval: 15s
      timeout: 5s
      retries: 40
      start_period: 150s
      # ${port} la port WebSocket (Netty), khong tra loi HTTP -> dung TCP connect.
      test: ["CMD-SHELL", "bash -c 'exec 3<>/dev/tcp/127.0.0.1/${port}'"]
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }
EOF
  done

  # login phai doi MOI game server. `!override` thay the han depends_on cua file goc
  # (mac dinh Compose se hop nhat, giu lai phu thuoc vao `game` da bi vo hieu hoa).
  echo ""
  echo "  login:"
  echo "    depends_on: !override"
  for entry in ${SPEC//,/ }; do
    IFS=':' read -r code _ _ <<<"$entry"
    echo "      game-${code}: { condition: service_healthy }"
  done
}

if [ "${1:-}" = "--write" ]; then
  gen > "$OUT"
  echo "da ghi $OUT ($(grep -c '^  game-' "$OUT") game server)"
  echo
  echo "Nho dong bo bang tcg.srv_game va platform.game_servers cho khop:"
  for entry in ${SPEC//,/ }; do
    IFS=':' read -r code port device <<<"$entry"
    echo "  $code -> wsPort $port, device $device"
  done
else
  gen
fi
