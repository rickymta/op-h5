#!/bin/bash
# Chay TU DONG boi image mysql:8.0 o LAN DAU khoi tao volume (docker-entrypoint-initdb.d),
# SAU moi file *.sql cung thu muc (ten "zz-" de xep cuoi). Image "source" file nay, nen khong
# duoc dat set -e/-u o muc ngoai — toan bo logic nam trong subshell.
#
# Lam gi:
#   1. Neu chua co tcg.srv_game (khong co dump that *.sql trong thu muc nay) -> nap bo seed sach
#      seed/*.sql (schema du 4 DB + dong cau hinh toi thieu, sinh boi tools/dump-to-seed.py).
#   2. Du la seed hay dump that: dien mat khau MySQL/Mongo/RabbitMQ vao tcg.cloud_* (game/cross/group
#      doc credential O DAY, khong doc env.yml), mat khau admin console vao tcg.staff, PUBLIC_HOST vao
#      cloud_device/srv_login, URL noi bo cross/group -> 127.0.0.1, tat gioi han srv_game_access.
#      => .env KHONG can khop mat khau cua server cu nua.
#   3. Them may chu con thieu theo GAME_SERVERS=s1:8001:d1,s2:8002:d1 (copy dong s1).
#
# Bien moi truong (compose truyen tu .env): MYSQL_ROOT_PASSWORD, MONGO_PASSWORD, RABBITMQ_PASSWORD,
# CONSOLE_ADMIN_PASSWORD, PUBLIC_HOST; tuy chon MONGO_USER (abc123), RABBITMQ_USER (admin), GAME_SERVERS.
#
# Lam lai tu dau: docker compose down -v  (xoa volume mysql-data) roi up.

_tcg_init() (
  set -eu
  local D="${TCG_INITDB_DIR:-/docker-entrypoint-initdb.d}"     # TCG_INITDB_DIR: chi de test ngoai container
  local SEED="$D/seed"
  local TAG='[tcg-init]'

  # --- chay SQL: qua ham cua image (khi duoc source) hoac mysql client (khi bi exec) ---
  if declare -F docker_process_sql >/dev/null 2>&1; then
    run_sql() { docker_process_sql "$@"; }
  else
    run_sql() { mysql --protocol=socket -uroot -hlocalhost --socket="${SOCKET:-/var/run/mysqld/mysqld.sock}" \
                      -p"${MYSQL_ROOT_PASSWORD:?}" --comments "$@"; }
  fi
  q() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/'"'"'/'"'"''"'"'/g'; }   # escape chuoi SQL: \ -> \\ ; ' -> ''
  one() { printf '%s' "$1" | run_sql -N 2>/dev/null | head -n1; }        # mot gia tri

  local missing=""
  for v in MYSQL_ROOT_PASSWORD MONGO_PASSWORD RABBITMQ_PASSWORD CONSOLE_ADMIN_PASSWORD PUBLIC_HOST; do
    [ -n "${!v:-}" ] || missing="$missing $v"
  done
  if [ -n "$missing" ]; then
    echo "$TAG LOI: thieu bien$missing — dat trong docker/.env (xem .env.example) roi: docker compose down -v && docker compose up -d" >&2
    return 1
  fi
  local MONGO_USER="${MONGO_USER:-abc123}" RABBITMQ_USER="${RABBITMQ_USER:-admin}" SPEC="${GAME_SERVERS:-s1:8001:d1}"

  # --- 1) seed hay dump ---
  local has
  has=$(one "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='tcg' AND table_name='srv_game';")
  if [ "${has:-0}" = "0" ]; then
    [ -d "$SEED" ] && ls "$SEED"/*.sql >/dev/null 2>&1 || { echo "$TAG LOI: khong co dump *.sql va cung khong co $SEED/*.sql" >&2; return 1; }
    for f in "$SEED"/*.sql; do
      echo "$TAG seed: $(basename "$f")"
      run_sql < "$f"
    done
    MODE=seed
  else
    MODE=dump
    echo "$TAG da co tcg.srv_game tu dump that — chi dong bo credential/host"
  fi

  # --- 2) credential + host theo .env (ca hai che do) ---
  run_sql <<SQL
UPDATE tcg.cloud_mysql SET conf_host='127.0.0.1', conf_username='root', conf_password='$(q "$MYSQL_ROOT_PASSWORD")';
UPDATE tcg.cloud_mongo SET conf_host='127.0.0.1', conf_username='$(q "$MONGO_USER")', conf_password='$(q "$MONGO_PASSWORD")', conf_source='admin';
UPDATE tcg.cloud_mq    SET conf_host='127.0.0.1', conf_username='$(q "$RABBITMQ_USER")', conf_password='$(q "$RABBITMQ_PASSWORD")';
UPDATE tcg.staff       SET password='$(q "$CONSOLE_ADMIN_PASSWORD")' WHERE username='admin';
UPDATE tcg.cloud_device SET host_WAN='$(q "$PUBLIC_HOST")'
 WHERE host_WAN='192.168.1.69' OR host_WAN LIKE '\_\_%' OR code IN (SELECT device_code FROM tcg.srv_game);
UPDATE tcg.srv_login   SET np_host_WAN='$(q "$PUBLIC_HOST")', np_host_LAN='127.0.0.1';
UPDATE tcg.srv_cross        SET url=CONCAT('http://127.0.0.1:', port, '/');
UPDATE tcg.srv_group_device SET url=CONCAT('http://127.0.0.1:', port, '/');
-- login chi cho thay may chu co dong access KHOP; Adapter goi /srv/game/list khong kem platformCode
UPDATE tcg.srv_game_access  SET mode=1, platform_limit=0, channel_limit=0, game_id_limit=0, ext_limit=0;
SQL

  # --- 3) may chu theo GAME_SERVERS (copy dong s1; khong ghi de dong da co ngoai port/device) ---
  local n=0 entry code port device idx
  for entry in ${SPEC//,/ }; do
    n=$((n + 1))
    IFS=':' read -r code port device <<<"$entry"
    [ -n "$code" ] && [ -n "$port" ] && [ -n "$device" ] || { echo "$TAG GAME_SERVERS: muc '$entry' sai (srvCode:wsPort:deviceCode)" >&2; return 1; }
    case "$port" in ''|*[!0-9]*) echo "$TAG GAME_SERVERS: wsPort cua $code khong phai so" >&2; return 1;; esac
    idx=$n; case "$code" in s[0-9]*) idx="${code#s}";; esac
    run_sql <<SQL
INSERT INTO tcg.cloud_device (code, name, host_WAN, host_LAN, host_domain, ssh_user, ssh_password, ssh_port)
  SELECT '$(q "$device")', NULL, '$(q "$PUBLIC_HOST")', '127.0.0.1', '127.0.0.1', '', '', 22 FROM DUAL
   WHERE NOT EXISTS (SELECT 1 FROM tcg.cloud_device WHERE code='$(q "$device")');
INSERT INTO tcg.srv_game (code, \`index\`, name, status, group_id, cross_code, recommend, folder, open_time, platform_code,
                          pay_scale, excel_mode, device_code, mongo_code, mysql_code, ws_scheme, ws_port, jvm_args,
                          creator, create_time, eaten, player_max)
  SELECT '$(q "$code")', $idx, 'Server $idx', t.status, t.group_id, t.cross_code, t.recommend, t.folder, CURDATE(), t.platform_code,
         t.pay_scale, t.excel_mode, '$(q "$device")', t.mongo_code, t.mysql_code, t.ws_scheme, $port, t.jvm_args,
         'seed', NOW(), 0, t.player_max
    FROM tcg.srv_game t WHERE t.code='s1'
     AND NOT EXISTS (SELECT 1 FROM tcg.srv_game WHERE code='$(q "$code")') LIMIT 1;
UPDATE tcg.srv_game SET ws_port=$port, device_code='$(q "$device")' WHERE code='$(q "$code")';
INSERT INTO tcg.srv_game_access (srv_code, mode, platform_limit, platform_code, channel_limit, channel_code, game_id_limit, game_id, ext_limit, ext)
  SELECT '$(q "$code")', 1, 0, NULL, 0, NULL, 0, NULL, 0, NULL FROM DUAL
   WHERE NOT EXISTS (SELECT 1 FROM tcg.srv_game_access WHERE srv_code='$(q "$code")');
SQL
  done

  # --- kiem tra: khong con placeholder ---
  local left
  left=$(one "SELECT (SELECT COUNT(*) FROM tcg.cloud_mysql WHERE conf_password LIKE '\_\_%')
              + (SELECT COUNT(*) FROM tcg.cloud_mongo WHERE conf_password LIKE '\_\_%' OR conf_username LIKE '\_\_%')
              + (SELECT COUNT(*) FROM tcg.cloud_mq    WHERE conf_password LIKE '\_\_%' OR conf_username LIKE '\_\_%')
              + (SELECT COUNT(*) FROM tcg.staff        WHERE password LIKE '\_\_%')
              + (SELECT COUNT(*) FROM tcg.cloud_device WHERE host_WAN LIKE '\_\_%')
              + (SELECT COUNT(*) FROM tcg.srv_login    WHERE np_host_WAN LIKE '\_\_%');")
  [ "${left:-1}" = "0" ] || { echo "$TAG LOI: con $left o placeholder chua dien" >&2; return 1; }

  echo "$TAG xong ($MODE). May chu trong tcg.srv_game:"
  printf '%s' "SELECT CONCAT('  ', code, '  ws=', ws_port, '  device=', device_code, '  open=', open_time) FROM tcg.srv_game ORDER BY \`index\`;" | run_sql -N
  echo "$TAG client thay host: $PUBLIC_HOST; cross/group noi bo: 127.0.0.1; admin console: admin"
)

_tcg_init || { echo '[tcg-init] THAT BAI — sua .env roi: docker compose down -v && docker compose up -d' >&2; return 1 2>/dev/null || exit 1; }
