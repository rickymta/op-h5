#!/bin/bash
# Seed cho DB `platform` cua nen tang (id/adapter/admin). Chay boi service `platform-seed`
# trong container mysql:8.0 (co san client `mysql`), network host -> 127.0.0.1:3306.
#
# Lam gi (moi buoc deu chay lai duoc, khong ghi de cai admin da sua):
#   1. CREATE DATABASE IF NOT EXISTS platform  — `id` khong tu tao DB, chi tu tao bang.
#   2. Doi `id` chay migration xong (bang oauth_clients/games/game_servers/game_devices/game_packages co mat).
#   3. Upsert:
#        oauth_clients  <- ADAPTER_CLIENT_ID + ADAPTER_REDIRECT_URI (client cong khai, chi PKCE)
#        games          <- ADAPTER_GAME_CODE/NAME, adapter_url 127.0.0.1:ADAPTER_PORT, site_url
#        game_devices   <- tcg.srv_game.device_code (+ ten tu tcg.cloud_device), max_online 1600
#        game_servers   <- tcg.srv_game (code, name, device_code, ws_port); khong co tcg -> GAME_SERVERS
#        game_packages  <- /seed/data/game_packages.<game>.sql (sinh boi tools/gen-game-packages.py)
#   Tai khoan quan tri dau tien do `admin` tu tao tu ADMIN_BOOTSTRAP_USER/PASSWORD (khi bang trong).
#
# Chay tay ngoai compose (may co client mysql):
#   MYSQL_ROOT_PASSWORD=... ADAPTER_REDIRECT_URI=http://host/auth/callback SEED_DIR=docker/platform-seed bash docker/platform-seed.sh
#   ... --print   -> chi in SQL, khong ket noi (de xem truoc)
set -euo pipefail

PRINT=0; [ "${1:-}" = "--print" ] && PRINT=1

: "${MYSQL_ROOT_PASSWORD:?thieu MYSQL_ROOT_PASSWORD}"
: "${ADAPTER_REDIRECT_URI:?thieu ADAPTER_REDIRECT_URI (vd http://<PUBLIC_HOST>/auth/callback)}"
DB_HOST=${ID_DB_HOST:-127.0.0.1}
DB_PORT=${ID_DB_PORT:-3306}
DB=${ID_DB_NAME:-platform}
GAME=${ADAPTER_GAME_CODE:-haitac}
GAME_NAME=${ADAPTER_GAME_NAME:-Đại Hải Trình}
CLIENT=${ADAPTER_CLIENT_ID:-$GAME}
ADAPTER_URL="http://127.0.0.1:${ADAPTER_PORT:-8090}"
SITE_URL=${ADAPTER_SITE_URL:-${ADAPTER_REDIRECT_URI%/auth/callback}}
SPEC=${GAME_SERVERS:-s1:8001:d1}
SEED_DIR=${SEED_DIR:-/seed/data}
WAIT=${SEED_WAIT_SECONDS:-600}

export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"     # khong dua mat khau len dong lenh
sql() { # $1 = SQL (co the nhieu cau); chay tren DB $2 (mac dinh khong chon DB)
  if [ "$PRINT" = 1 ]; then printf -- '-- [%s]\n%s\n' "${2:-}" "$1"; return 0; fi
  mysql -h"$DB_HOST" -P"$DB_PORT" -uroot --default-character-set=utf8mb4 --batch --skip-column-names ${2:+"$2"} -e "$1"
}
q() { printf '%s' "$1" | sed "s/'/''/g; s/\\\\/\\\\\\\\/g"; }   # escape cho chuoi SQL

echo "[seed] game=$GAME client=$CLIENT db=$DB redirect=$ADAPTER_REDIRECT_URI site=$SITE_URL"

# 1) DB
sql "CREATE DATABASE IF NOT EXISTS \`$DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2) doi migration cua `id`
if [ "$PRINT" = 0 ]; then
  need="'oauth_clients','games','game_servers','game_devices','game_packages'"
  for ((t=0; t<WAIT; t+=5)); do
    n=$(sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB' AND table_name IN ($need);" 2>/dev/null || echo 0)
    [ "${n:-0}" -ge 5 ] && break
    [ $((t % 30)) -eq 0 ] && echo "[seed] doi migration cua id ($n/5 bang sau ${t}s)"
    sleep 5
  done
  [ "${n:-0}" -ge 5 ] || { echo "[seed] LOI: sau ${WAIT}s van chua thay du bang — id chua chay migration? xem: docker compose logs id" >&2; exit 1; }
fi

# 3a) OIDC client cua game — cong khai (PKCE), secret_hash giu NULL; doi redirect khi PUBLIC_HOST doi
sql "INSERT INTO oauth_clients (client_id, name, secret_hash, redirect_uris, scopes, require_pkce, status)
     VALUES ('$(q "$CLIENT")', '$(q "$GAME_NAME")', NULL, '$(q "$ADAPTER_REDIRECT_URI")', 'openid profile wallet', 1, 'active')
     ON DUPLICATE KEY UPDATE name=VALUES(name), redirect_uris=VALUES(redirect_uris);" "$DB"

# 3b) games — trang quan tri hoi adapter nao
sql "INSERT INTO games (code, name, adapter_url, site_url, status, sort_order)
     VALUES ('$(q "$GAME")', '$(q "$GAME_NAME")', '$(q "$ADAPTER_URL")', '$(q "$SITE_URL")', 'active', 1)
     ON DUPLICATE KEY UPDATE name=VALUES(name), adapter_url=VALUES(adapter_url), site_url=VALUES(site_url);" "$DB"

# 3c) doi server: uu tien tcg.srv_game (nguon su that cua cum game), khong co thi doc GAME_SERVERS
has_tcg=0
if [ "$PRINT" = 0 ]; then
  has_tcg=$(sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='tcg' AND table_name='srv_game';" 2>/dev/null || echo 0)
fi
if [ "${has_tcg:-0}" -ge 1 ]; then
  echo "[seed] game_servers/game_devices tu tcg.srv_game"
  sql "INSERT INTO game_devices (game_code, device_code, name, max_online)
       SELECT '$(q "$GAME")', s.device_code, COALESCE(MAX(d.name), s.device_code), 1600
         FROM tcg.srv_game s LEFT JOIN tcg.cloud_device d ON d.code = s.device_code
        WHERE s.device_code IS NOT NULL AND s.device_code <> ''
        GROUP BY s.device_code
       ON DUPLICATE KEY UPDATE name=VALUES(name);
       INSERT INTO game_servers (game_code, srv_code, name, device_code, ws_port, recommend, status)
       SELECT '$(q "$GAME")', s.code, COALESCE(s.name, s.code), s.device_code, s.ws_port,
              IF(COALESCE(s.recommend,1)=0,0,1), IF(COALESCE(s.eaten,0)=1,'merged','running')
         FROM tcg.srv_game s
        WHERE s.code IS NOT NULL AND s.device_code IS NOT NULL AND s.ws_port IS NOT NULL
       ON DUPLICATE KEY UPDATE name=VALUES(name), device_code=VALUES(device_code), ws_port=VALUES(ws_port);" "$DB"
else
  echo "[seed] khong co tcg.srv_game — dung GAME_SERVERS=$SPEC"
  for entry in ${SPEC//,/ }; do
    IFS=':' read -r code port device <<<"$entry"
    [ -n "$code" ] && [ -n "$port" ] && [ -n "$device" ] || { echo "[seed] muc '$entry' sai dinh dang srvCode:wsPort:deviceCode" >&2; exit 1; }
    sql "INSERT INTO game_devices (game_code, device_code, name, max_online) VALUES ('$(q "$GAME")','$(q "$device")','$(q "$device")',1600)
         ON DUPLICATE KEY UPDATE name=name;
         INSERT INTO game_servers (game_code, srv_code, name, device_code, ws_port) VALUES ('$(q "$GAME")','$(q "$code")','Server ${code#s}','$(q "$device")',$port)
         ON DUPLICATE KEY UPDATE device_code=VALUES(device_code), ws_port=VALUES(ws_port);" "$DB"
  done
fi

# 3d) goi quy doi
PKG="$SEED_DIR/game_packages.$GAME.sql"
if [ -f "$PKG" ]; then
  if [ "$PRINT" = 1 ]; then echo "-- [$DB] < $PKG ($(grep -c "^('" "$PKG" || true) dong)"; else
    mysql -h"$DB_HOST" -P"$DB_PORT" -uroot --default-character-set=utf8mb4 "$DB" < "$PKG"
    echo "[seed] game_packages nap tu $PKG"
  fi
else
  echo "[seed] khong co $PKG — bo qua game_packages (sinh bang tools/gen-game-packages.py)"
fi

[ "$PRINT" = 1 ] && exit 0
echo "[seed] xong:"
sql "SELECT 'oauth_clients', COUNT(*) FROM oauth_clients UNION ALL SELECT 'games', COUNT(*) FROM games
     UNION ALL SELECT 'game_devices', COUNT(*) FROM game_devices UNION ALL SELECT 'game_servers', COUNT(*) FROM game_servers
     UNION ALL SELECT 'game_packages', COUNT(*) FROM game_packages UNION ALL SELECT 'admin_users', COUNT(*) FROM admin_users;" "$DB" | sed 's/^/[seed]   /'
