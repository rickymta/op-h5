#!/bin/bash
# Dien secrets + IP cong khai vao config trong container roi exec lenh cua service.
# Chay moi lan container start (config nam trong layer cua container, khong anh huong image).
#
# Bien moi truong bat buoc (tu docker/.env):
#   TCG_SECRET, MYSQL_ROOT_PASSWORD, MONGO_PASSWORD, RABBITMQ_PASSWORD, PUBLIC_HOST
set -e
S=/h5/server
need() { [ -n "${!1:-}" ] || { echo "[tcg-entrypoint] thieu bien $1" >&2; exit 1; }; }
for v in TCG_SECRET MYSQL_ROOT_PASSWORD MONGO_PASSWORD RABBITMQ_PASSWORD PUBLIC_HOST; do need "$v"; done

esc() { printf '%s' "$1" | sed -e 's/[\/&|]/\\&/g'; }   # an toan cho sed voi / & |
CFG="$S/console/config/env.yml $S/statistic/config/env.yml $S/cross/config/env.yml $S/game/config/env.yml \
     $S/group/config/env.yml $S/meta/config/env.yml $S/pay/config/env.yml $S/world/config/env.yml \
     $S/login/application.yml $S/console/store/global.conf.json"
for f in $CFG; do
  [ -f "$f" ] || continue
  sed -i \
    -e "s|__TCG_SECRET__|$(esc "$TCG_SECRET")|g" \
    -e "s|__MYSQL_ROOT_PASSWORD__|$(esc "$MYSQL_ROOT_PASSWORD")|g" \
    -e "s|__MONGO_PASSWORD__|$(esc "$MONGO_PASSWORD")|g" \
    -e "s|__RABBITMQ_PASSWORD__|$(esc "$RABBITMQ_PASSWORD")|g" \
    -e "s|192\.168\.1\.69|$(esc "$PUBLIC_HOST")|g" \
    -e "s|http://123\.253\.26\.34:88/cli/app/icon/|http://$(esc "$PUBLIC_HOST")/cli/app/icon/|g" \
    "$f"
done
# PUBLIC_SCHEME=https: dua loginNP/statNP trong global.conf.json ve cong cong khai.
#
# VI SAO: client lay dia chi login/statistic tu day (KHONG phai tu tcg.srv_login — bang do
# phuc vu viec khac). Voi mot server chi mo 80/443, de nguyen port 9000/7788 la client goi
# vao cho khong ai nghe; va khi trang chay HTTPS thi trinh duyet con chan noi dung hon hop.
#
# Sau khi doi, nginx nhan cac duong /account/, /srv/, /stat/ tren 443 roi chuyen tiep vao
# dich vu chay loopback. Xem docker/nginx/game_site.conf va docs/deploy-runbook.md.
#
# Dung perl chu khong phai python/jq: image nay chi co perl/awk/sed. Va sua CO PHAM VI —
# chi trong khoi cua dung khoa loginNP/statNP — chu khong thay moi "port":9000 trong file,
# vi so do con xuat hien o cho khac.
if [ "${PUBLIC_SCHEME:-http}" = "https" ]; then
  GC="$S/console/store/global.conf.json"
  if [ -f "$GC" ]; then
    PORT="${PUBLIC_PORT:-443}" perl -0pi -e '
      my $port = $ENV{PORT};
      for my $key (qw(loginNP statNP)) {
        # Khop tu "<key>":{ den dau } cung cap. Cac khoi nay khong long nhau ngoai "host",
        # nen mot lop long la du.
        s{("\Q$key\E"\s*:\s*\{)((?:[^{}]|\{[^{}]*\})*)(\})}{
          my ($mo, $than, $dong) = ($1, $2, $3);
          $than =~ s/"scheme"\s*:\s*"[^"]*"/"scheme":"https"/;
          $than =~ s/"port"\s*:\s*\d+/"port":$port/;
          $than =~ s/"ssl"\s*:\s*(?:true|false)/"ssl":true/;
          $mo . $than . $dong;
        }gex;
      }
    ' "$GC" && echo "[tcg-entrypoint] loginNP/statNP -> https:${PUBLIC_PORT:-443}"
  fi
fi

if grep -rqE '__[A-Z_]+__' $CFG 2>/dev/null; then
  echo "[tcg-entrypoint] CANH BAO: van con placeholder:" >&2
  grep -rnoE '__[A-Z_]+__' $CFG >&2 || true
fi
# logback ghi vao .logs/ tuong doi voi working_dir; tao truoc de tranh loi quyen
mkdir -p "$(pwd)/.logs"
echo "[tcg-entrypoint] $(basename "$(pwd)") -> PUBLIC_HOST=$PUBLIC_HOST; exec: $*"
exec "$@"
