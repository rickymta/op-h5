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
  # KHONG dung `grep -r --include`: image la alpine, BusyBox grep khong co --include nen
  # lenh chet voi "unrecognized option", stderr bi nuot, pipeline van tra 0 -> moi secret
  # bi bo qua trong im lang va PHP chay voi placeholder (PDO that bai, trang tra 200 rong).
  find "$W" -type f -name '*.php' -exec grep -lF "$1" {} + 2>/dev/null \
    | while read -r f; do sed -i "s|$1|$(esc "$2")|g" "$f"; done
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
fill __BANK_CALLBACK_CHECKSUM__ "${BANK_CALLBACK_CHECKSUM:-}"

# 2b) Bao dong neu con placeholder. Khong the im lang o day: PHP dat error_reporting(0)
#     nen `new PDO(... "__MYSQL_ROOT_PASSWORD__")` chi lam trang tra HTTP 200 THAN RONG,
#     khong co dong log nao — nhin tu ngoai giong het nhu chay binh thuong.
LEFT=$(find "$W" -type f -name '*.php' -exec grep -lE '__[A-Z0-9_]{4,}__' {} + 2>/dev/null | wc -l)
if [ "$LEFT" -gt 0 ]; then
  echo "[web-entrypoint] CANH BAO: con $LEFT file PHP giu placeholder chua dien:" >&2
  find "$W" -type f -name '*.php' -exec grep -lE '__[A-Z0-9_]{4,}__' {} + 2>/dev/null \
    | sed "s|^$W/|  - |" >&2
  echo "[web-entrypoint] cac trang dung chung se tra 200 rong. Dat bien tuong ung trong .env." >&2
else
  echo "[web-entrypoint] secrets: da dien het, khong con placeholder"
fi

# 3) bien moi truong cho PHP. php-fpm xoa env cua tien trinh (clear_env) nen getenv() trong PHP
#    khong thay .env; chi dua dung 3 bien cua vi ID vao pool, khong dua ca .env (secret khac
#    khong co viec gi trong PHP). Chi lam khi day la image php-fpm.
FPM_D=/usr/local/etc/php-fpm.d
if [ -d "$FPM_D" ]; then
  {
    echo "; sinh boi web-entrypoint luc start — dung sua tay"
    echo "[www]"
    # GM tool doc ID_DB_* de noi vao bang gm_users, va GM_BOOTSTRAP_* de tao tai khoan
    # dau tien. php-fpm xoa env cua tien trinh (clear_env) nen phai dua qua pool.
    for v in ID_BASE_URL ID_INTERNAL_SECRET ID_WALLET_ENABLED ADAPTER_BASE_URL \
             ID_DB_HOST ID_DB_NAME ID_DB_USER ID_DB_PASSWORD \
             GM_BOOTSTRAP_USER GM_BOOTSTRAP_PASSWORD; do
      [ -n "${!v:-}" ] && printf 'env[%s] = "%s"
' "$v" "${!v}"
    done
  } > "$FPM_D/zz-env.conf"
  echo "[web-entrypoint] php-fpm env: $(grep -c '^env\[' "$FPM_D/zz-env.conf") bien (ID_WALLET_ENABLED=${ID_WALLET_ENABLED:-0})"
fi

left=$(grep -rhoE '__[A-Z_]+__' "$W" --include='*.php' 2>/dev/null | sort -u | tr '\n' ' ')
[ -z "$left" ] || echo "[web-entrypoint] placeholder chua dien (bo qua neu la nginx): $left" >&2
echo "[web-entrypoint] PUBLIC_HOST=$PUBLIC_HOST; exec: $*"
exec "$@"
