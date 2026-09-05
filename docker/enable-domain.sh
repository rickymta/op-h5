#!/usr/bin/env bash
# Bat domain that + HTTPS cho stack DANG CHAY theo IP. Chay TREN SERVER, quyen root, sau server-bootstrap.sh.
#
#   ./enable-domain.sh antfarms.xyz [email-nhan-thong-bao-letsencrypt]
#
# Lam gi (moi buoc chay lai duoc, khong lam hai khi lap):
#   1. DNS: 4 ten (D, www.D, id.D, haitac.D) phai giai ve IP cua may nay (SKIP_DNS_CHECK=1 de bo qua).
#   2. certbot: cai neu thieu; xin MOT chung chi SAN cho 4 ten bang webroot qua nginx dang chay
#      (game.conf che do IP phuc vu /.well-known/acme-challenge/ tu ACME_DIR, mac dinh /var/www/acme).
#      Khong tat nginx, khong can mo cong nao khac ngoai 80.
#   3. Sinh /opt/tcg/nginx/{domains.conf,tls.conf} tu mau nginx/ (dien __PUBLIC_DOMAIN__).
#   4. Ghi docker-compose.domain.yml: mount 2 file do + /etc/letsencrypt vao service nginx.
#      server-bootstrap.sh tu dung kem file nay khi thay no.
#   5. Sua .env: PUBLIC_HOST=haitac.D, PUBLIC_DOMAIN=D, PUBLIC_SCHEME=https, PUBLIC_PORT=443,
#      ID_ISSUER=https://id.D, ID_COOKIE_SECURE=true, ADAPTER_REDIRECT_URI=https://haitac.D/auth/callback,
#      ADAPTER_SITE_URL=https://haitac.D, ADAPTER_TLS=true.
#   6. `up -d` voi overlay: service nao doi env duoc tao lai (Java: server-entrypoint sua loginNP/statNP
#      sang https:443; php/nginx: web-entrypoint dien host moi vao bundle; platform-seed cap nhat
#      oauth_clients.redirect_uris). Roi UPDATE tcg.cloud_device.host_WAN + srv_login.np_host_WAN = haitac.D
#      (zz-init.sh chi chay lan khoi tao dau, luc do host con la IP).
#   7. Hook gia han: certbot renew -> reload nginx trong container.
#
# Sau khi xong: ra ngoai chi can 80/443 (ufw allow 80,443/tcp); 9000/8001/12345/7788/8080 dong duoc
# vi client di qua 443 bang tien to /meta/ /stat/ /account/ /srv/ /game.
#
# CHUA KIEM CHUNG voi domain + chung chi that (2026-09-05): moi chay nginx -t va thu duong dan qua HTTP.
set -euo pipefail
cd "$(dirname "$0")"
D="${1:-}"; EMAIL="${2:-${ACME_EMAIL:-}}"
[ -n "$D" ] || { echo "dung: ./enable-domain.sh <domain> [email]" >&2; exit 1; }
case "$D" in *://*|*/*|www.*|id.*|haitac.*) echo "chi dua ten goc, vd antfarms.xyz" >&2; exit 1;; esac
[ -f .env ] || { echo "chua co .env — chay server-bootstrap.sh (hoac gen-env.sh) truoc" >&2; exit 1; }
[ -f nginx/domains.conf ] && [ -f nginx/tls.conf ] || { echo "thieu nginx/domains.conf hoac nginx/tls.conf" >&2; exit 1; }

NAMES="$D www.$D id.$D haitac.$D"
# Doc mot khoa trong .env. Dung `sed -n ...p` chu khong phai `grep`: voi `set -o pipefail`,
# grep khong khop tra ve 1 -> ca pipeline tra 1 -> `V=$(envget X)` lam `set -e` thoat NGAY,
# khong in gi. Da dinh that: ACME_DIR khong co trong .env.example nen script chet o dong
# nay truoc khi in duoc buoc 1/7. sed -n tra 0 ke ca khi khong khop.
envget() { sed -n "s/^$1=//p" .env | head -1 | sed 's/ *#.*//'; }
ACME_DIR=$(envget ACME_DIR); ACME_DIR="${ACME_DIR:-/var/www/acme}"
NGX="${NGINX_DIR:-/opt/tcg/nginx}"
OVERLAY=docker-compose.domain.yml
C="docker compose -f docker-compose.image.yml"
[ -f "$OVERLAY" ] && C="$C -f $OVERLAY"

echo "== 1/7 DNS"
MYIP=$(curl -fsS -m 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
bad=0
for n in $NAMES; do
  ip=$(getent ahostsv4 "$n" 2>/dev/null | awk '{print $1; exit}')
  if [ "$ip" = "$MYIP" ]; then echo "  ok   $n -> $ip"; else echo "  !!   $n -> '${ip:-khong giai duoc}' (may nay: $MYIP)"; bad=1; fi
done
[ "$bad" = 0 ] || [ "${SKIP_DNS_CHECK:-0}" = 1 ] || { echo "Tro 4 ban ghi A ve $MYIP, doi DNS lan, chay lai (hoac SKIP_DNS_CHECK=1 neu chac)" >&2; exit 1; }

echo "== 2/7 Chung chi Let's Encrypt (webroot $ACME_DIR qua nginx dang chay)"
if ! command -v certbot >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then apt-get update -qq && apt-get install -y -qq certbot >/dev/null
  elif command -v dnf >/dev/null 2>&1; then dnf install -y -q certbot
  else yum install -y -q epel-release >/dev/null 2>&1 || true; yum install -y -q certbot; fi
fi
mkdir -p "$ACME_DIR/.well-known/acme-challenge"
echo tcg-ping > "$ACME_DIR/.well-known/acme-challenge/tcg-ping"
if ! curl -fsS -m 5 "http://127.0.0.1/.well-known/acme-challenge/tcg-ping" 2>/dev/null | grep -q tcg-ping; then
  echo "  nginx chua phuc vu $ACME_DIR — tao lai container nginx (co mount ACME_DIR) roi thu lai"
  docker compose -f docker-compose.image.yml up -d nginx; sleep 4
  curl -fsS -m 5 "http://127.0.0.1/.well-known/acme-challenge/tcg-ping" | grep -q tcg-ping \
    || { echo "!! nginx van khong phuc vu /.well-known/acme-challenge/ — image nginx cu? pull lai: $C pull nginx && $C up -d nginx" >&2; exit 1; }
fi
rm -f "$ACME_DIR/.well-known/acme-challenge/tcg-ping"
if [ -f "/etc/letsencrypt/live/$D/fullchain.pem" ]; then
  echo "  da co chung chi $D — bo qua (certbot renew lo gia han)"
else
  args=(certonly --webroot -w "$ACME_DIR" --non-interactive --agree-tos --cert-name "$D")
  for n in $NAMES; do args+=(-d "$n"); done
  if [ -n "$EMAIL" ]; then args+=(-m "$EMAIL"); else args+=(--register-unsafely-without-email); fi
  certbot "${args[@]}"
  [ -f "/etc/letsencrypt/live/$D/fullchain.pem" ] || { echo "!! certbot khong tao duoc chung chi" >&2; exit 1; }
fi

echo "== 3/7 nginx: $NGX/{domains.conf,tls.conf} tu mau"
mkdir -p "$NGX"
sed "s/__PUBLIC_DOMAIN__/$D/g" nginx/domains.conf > "$NGX/domains.conf"
sed "s/__PUBLIC_DOMAIN__/$D/g" nginx/tls.conf     > "$NGX/tls.conf"
grep -q '__PUBLIC_DOMAIN__' "$NGX/domains.conf" "$NGX/tls.conf" && { echo "!! con __PUBLIC_DOMAIN__ chua dien" >&2; exit 1; }

echo "== 4/7 $OVERLAY"
cat > "$OVERLAY" <<EOF
# SINH boi enable-domain.sh ($D, $(date +%F)) — dung KEM docker-compose.image.yml:
#   docker compose -f docker-compose.image.yml -f $OVERLAY up -d
# server-bootstrap.sh tu them file nay khi thay no. Xoa file nay + \`up -d --remove-orphans\` de quay ve che do IP.
services:
  nginx:
    volumes:
      - $NGX/domains.conf:/etc/nginx/conf.d/domains.conf:ro
      - $NGX/tls.conf:/etc/nginx/tls.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
EOF
C="docker compose -f docker-compose.image.yml -f $OVERLAY"

echo "== 5/7 .env -> https"
setv() { if grep -qE "^$1=" .env; then sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak; else echo "$1=$2" >> .env; fi; }
setv PUBLIC_HOST          "haitac.$D"
setv PUBLIC_DOMAIN        "$D"
setv PUBLIC_SCHEME        https
setv PUBLIC_PORT          443
setv ID_ISSUER            "https://id.$D"
setv ID_COOKIE_SECURE     true
setv ADAPTER_REDIRECT_URI "https://haitac.$D/auth/callback"
setv ADAPTER_SITE_URL     "https://haitac.$D"
setv ADAPTER_TLS          true
grep -E '^(PUBLIC_HOST|PUBLIC_SCHEME|ID_ISSUER|ADAPTER_REDIRECT_URI|ADAPTER_TLS)=' .env | sed 's/^/  /'

echo "== 6/7 up -d voi overlay (tao lai service doi env; 2-5 phut)"
$C config -q
$C up -d
for _ in $(seq 1 30); do
  curl -fsS -m 5 -o /dev/null -k "https://127.0.0.1/" -H "Host: haitac.$D" 2>/dev/null && break
  sleep 5
done
MYSQL_PW=$(envget MYSQL_ROOT_PASSWORD)
$C exec -T -e MYSQL_PWD="$MYSQL_PW" mysql mysql -uroot -N -e "
  UPDATE tcg.cloud_device SET host_WAN='haitac.$D' WHERE code IN (SELECT device_code FROM tcg.srv_game);
  UPDATE tcg.srv_login    SET np_host_WAN='haitac.$D';
  SELECT CONCAT('  cloud_device ', code, ' -> ', host_WAN) FROM tcg.cloud_device WHERE code IN (SELECT device_code FROM tcg.srv_game);" \
  || echo "  !! khong cap nhat duoc tcg.cloud_device — chay tay: UPDATE tcg.cloud_device SET host_WAN='haitac.$D' WHERE code='d1';"

echo "== 7/7 hook gia han chung chi"
HOOK=/etc/letsencrypt/renewal-hooks/deploy/tcg-nginx-reload.sh
mkdir -p "$(dirname "$HOOK")"
cat > "$HOOK" <<EOF
#!/bin/bash
# certbot renew -> nap lai chung chi trong container nginx (sinh boi enable-domain.sh)
cd "$(pwd)" && docker compose -f docker-compose.image.yml -f $OVERLAY exec -T nginx nginx -s reload
EOF
chmod +x "$HOOK"
certbot renew --dry-run --no-random-sleep-on-renew >/dev/null 2>&1 && echo "  certbot renew --dry-run: ok" || echo "  !! certbot renew --dry-run that bai — xem /var/log/letsencrypt/letsencrypt.log"

cat <<EOF

XONG. Kiem tra tu may khac:
  https://$D/                         trang chinh (he thong ID)
  https://id.$D/                      dang ky / tai khoan
  https://haitac.$D/                  game: /may-chu, /quy-doi, /choi-game
  curl -sI https://haitac.$D/meta/announce/one | head -1     # 200 = duong /meta/ qua 443 ok
Firewall: chi con can 80 va 443 — ufw allow 80,443/tcp; cac cong 9000 8001 12345 7788 8080 dong duoc.
GM tool van chi loopback: ssh -L 8080:127.0.0.1:80 root@<server> -> http://127.0.0.1:8080/adminportal
Quay ve che do IP: rm $OVERLAY; sua lai .env (PUBLIC_SCHEME=http, ADAPTER_TLS=false, PUBLIC_HOST=<IP>...); docker compose -f docker-compose.image.yml up -d
EOF
