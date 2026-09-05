#!/usr/bin/env bash
# Sinh docker/.env tu .env.example voi bi mat ngau nhien — chi can biet PUBLIC_HOST.
#
#   ./gen-env.sh 1.2.3.4              # IP hoac domain ma NGUOI CHOI truy cap (khong scheme)
#   ./gen-env.sh 1.2.3.4 --force      # ghi de .env dang co. CANH BAO: volume MySQL/Mongo/MQ da tao
#                                     # bang mat khau cu se KHONG khop nua -> phai `compose down -v`.
#
# Sinh: TCG_SECRET, 3 mat khau ha tang, CONSOLE_ADMIN_PASSWORD, ma GM/REV, khoa ky ID (RSA 2048),
#       ID_INTERNAL_SECRET, ADAPTER_SECRET_ENC_KEY, tai khoan owner trang quan tri; dat ID_ISSUER va
#       ADAPTER_REDIRECT_URI theo http://<PUBLIC_HOST>. Chua co domain/https nen cookie secure = false.
# De trong (dien sau khi can): THESIEUTOC_API_KEY, MOMO_*, BANK_CALLBACK_CHECKSUM, GM_LOGIN_TOKEN, SMTP.
# Mat khau/ma sinh dang hex -> khong co ky tu dac biet, an toan cho SQL, YAML va .env.
set -euo pipefail
cd "$(dirname "$0")"

HOST="${1:-}"
[ -n "$HOST" ] || { echo "dung: ./gen-env.sh <PUBLIC_HOST> [--force]" >&2; exit 1; }
case "$HOST" in *://*|*/*) echo "PUBLIC_HOST chi la IP hoac domain, khong co http:// hay duong dan" >&2; exit 1;; esac
if [ -f .env ] && [ "${2:-}" != "--force" ]; then
  echo ".env da co — giu nguyen. Them --force de sinh lai (nho compose down -v vi mat khau doi)."
  exit 0
fi
command -v openssl >/dev/null || { echo "thieu openssl (apt-get install -y openssl)" >&2; exit 1; }

hex() { head -c "${1:-16}" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
b64() { openssl rand -base64 32 | tr -d '\n'; }

cp .env.example .env
setv() { # $1 key, $2 value: thay ca dong "KEY=..." (bo comment cuoi dong), them neu chua co
  if grep -qE "^$1=" .env; then
    sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak
  else
    echo "$1=$2" >> .env
  fi
}

ADMIN_USER=quantri
ADMIN_PW=$(hex 8)
CONSOLE_PW=$(hex 12)

setv PUBLIC_HOST            "$HOST"
setv TCG_SECRET             "$(hex 16)"
setv MYSQL_ROOT_PASSWORD    "$(hex 12)"
setv MONGO_PASSWORD         "$(hex 12)"
setv RABBITMQ_PASSWORD      "$(hex 12)"
setv CONSOLE_ADMIN_PASSWORD "$CONSOLE_PW"
setv REV_QUERY_KEY          "$(hex 16)"
setv GM_CODE                "$(hex 8)"
setv GMHANGLONG_CODE        "$(hex 8)"
setv ID_ISSUER              "http://$HOST:8080"
setv ID_COOKIE_SECURE       false
setv ID_INTERNAL_SECRET     "$(b64)"
setv ID_WALLET_ENABLED      1
setv ADAPTER_REDIRECT_URI   "http://$HOST/auth/callback"
setv ADAPTER_SECRET_ENC_KEY "$(b64)"
setv ADMIN_COOKIE_SECURE    false
setv ADMIN_BOOTSTRAP_USER   "$ADMIN_USER"
setv ADMIN_BOOTSTRAP_PASSWORD "$ADMIN_PW"

# Khoa ky JWT cua he thong ID: nhieu dong, de cuoi file trong ngoac kep (Compose doc duoc).
sed -i.bak '/^ID_SIGNING_KEY_PEM=/d' .env && rm -f .env.bak
printf 'ID_SIGNING_KEY_PEM="%s"\n' "$(openssl genrsa 2048 2>/dev/null)" >> .env
chmod 600 .env

cat <<EOF
Da sinh $(pwd)/.env cho PUBLIC_HOST=$HOST
  Trang quan tri (ssh -L 8100:127.0.0.1:8100 -> http://127.0.0.1:8100): $ADMIN_USER / $ADMIN_PW
  Console :9999 va GM tool: admin / $CONSOLE_PW
  Cac gia tri khac: grep -E '^(TCG_SECRET|MYSQL_ROOT_PASSWORD|MONGO_PASSWORD|RABBITMQ_PASSWORD|GM_CODE|GMHANGLONG_CODE|REV_QUERY_KEY)=' .env
Con trong (dien khi can): THESIEUTOC_API_KEY, MOMO_CALLBACK_SIGNATURE, MOMO_PHONE, BANK_CALLBACK_CHECKSUM, GM_LOGIN_TOKEN, ID_SMTP_*.
EOF
