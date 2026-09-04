#!/bin/bash
# Dung chung cho image php va nginx: dien secrets + PUBLIC_HOST vao website/game roi exec.
# Chi PUBLIC_HOST la bat buoc; secret nao thieu se de nguyen placeholder va in canh bao
# (de nginx - chi phuc vu file tinh - van chay duoc ma khong can biet mat khau DB).
set -e
W=/www/wwwroot/game
[ -n "${PUBLIC_HOST:-}" ] || { echo "[web-entrypoint] thieu PUBLIC_HOST" >&2; exit 1; }
esc() { printf '%s' "$1" | sed -e 's/[\/&|]/\\&/g'; }

# 1) host cong khai: bundle client (4 literal co port), og:url, site home.
#    Ghi host da ap dung vao .public-host. Ly do: voi bind mount (docker-compose.yml)
#    cay nguon nam tren HOST va khong quay lai 192.168.1.69 sau lan chay dau, nen neu
#    cu sed tu IP goc thi doi PUBLIC_HOST lan sau se im lang khong co tac dung.
esc_re() { printf '%s' "$1" | sed -e 's/[][\.*^$\/&|]/\\&/g'; }   # escape cho VE TRAI cua sed
HOST_FILES="$W/libs/e228b-0b904-ac44c.js $W/user/index.php $W/user/indexapk.php"
MARK="$W/.public-host"
PREV=$(cat "$MARK" 2>/dev/null) || true
[ -n "${PREV:-}" ] || PREV=192.168.1.69
if [ "$PREV" != "$PUBLIC_HOST" ]; then
  for f in $HOST_FILES; do
    [ -f "$f" ] && sed -i "s|$(esc_re "$PREV")|$(esc "$PUBLIC_HOST")|g" "$f"
  done
  printf '%s' "$PUBLIC_HOST" > "$MARK" 2>/dev/null \
    || echo "[web-entrypoint] canh bao: khong ghi duoc $MARK; doi PUBLIC_HOST lan sau se khong co tac dung" >&2
  echo "[web-entrypoint] host client: $PREV -> $PUBLIC_HOST"
else
  echo "[web-entrypoint] host client da la $PUBLIC_HOST, bo qua"
fi

# 2) secrets (chi khi bien co gia tri)
fill() { # $1 placeholder, $2 gia tri
  [ -n "$2" ] || return 0
  grep -rlF "$1" "$W" --include='*.php' 2>/dev/null | while read -r f; do sed -i "s|$1|$(esc "$2")|g" "$f"; done
}
fill __MYSQL_ROOT_PASSWORD__    "${MYSQL_ROOT_PASSWORD:-}"
fill __WEB_DB_PASSWORD_REV__    "${WEB_DB_PASSWORD_REV:-${MYSQL_ROOT_PASSWORD:-}}"
fill __CONSOLE_ADMIN_PASSWORD__ "${CONSOLE_ADMIN_PASSWORD:-}"
fill __THESIEUTOC_API_KEY__     "${THESIEUTOC_API_KEY:-}"
fill __MOMO_CALLBACK_SIGNATURE__ "${MOMO_CALLBACK_SIGNATURE:-}"
fill __REV_QUERY_KEY__          "${REV_QUERY_KEY:-}"
fill __GM_CODE__                "${GM_CODE:-}"
fill __GMHANGLONG_CODE__        "${GMHANGLONG_CODE:-}"
fill __GM_LOGIN_TOKEN__         "${GM_LOGIN_TOKEN:-}"
fill __MOMO_PHONE__             "${MOMO_PHONE:-}"

left=$(grep -rhoE '__[A-Z_]+__' "$W" --include='*.php' 2>/dev/null | sort -u | tr '\n' ' ')
[ -z "$left" ] || echo "[web-entrypoint] placeholder chua dien (bo qua neu la nginx): $left" >&2
echo "[web-entrypoint] PUBLIC_HOST=$PUBLIC_HOST; exec: $*"
exec "$@"
