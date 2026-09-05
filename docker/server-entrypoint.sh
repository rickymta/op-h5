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
# PUBLIC_SCHEME=https: dua loginNP trong global.conf.json ve cong cong khai.
#
# VI SAO chi loginNP: meta khong tu giu danh sach login server (meta.conf.json chi co
# {"client":{"version":...}}) — no lay tu loginNP roi CONG BO cho client qua
# /facade/client/start. Da doi chieu tren server that: sau khi doi, serverList tra ve
# {"scheme":"https","host":"haitac.<domain>","port":443}. Voi server chi mo 80/443, de
# nguyen 9000 la client goi vao cho khong ai nghe; va trang HTTPS con bi chan noi dung
# hon hop. Sau khi doi, nginx nhan /account/ va /srv/ tren 443 roi chuyen vao loopback.
#
# VI SAO KHONG dong statNP — da tung lam va da HONG:
#   global.conf.json la cau hinh NOI BO giua cac service Java, khong phai cau hinh client.
#   Client lay dia chi thong ke tu a3b31-4c087-1dc2f.js (location.origin + "/stat/"),
#   KHONG doc statNP. Doi statNP thanh https:443 lam tien trinh game goi ra dia chi cong
#   khai va dinh 404:
#     RoleKeyNumHandler - 同步...失败:POST请求结果异常:404,
#     uri=https://haitac.<domain>:443//res/role/key/num/update/batch
#   (hai dau gach: base ghep voi path deu co "/"; qua nginx thi "//res/" rut gon thanh
#   "/res/" va roi vao khoi tai nguyen tinh -> 404). Hau qua: du lieu quan trong theo
#   nhan vat khong bao gio dong bo sang statistic. Giu statNP o dia chi noi bo.
#
# Dung perl chu khong phai python/jq: image nay chi co perl/awk/sed. Va sua CO PHAM VI —
# chi trong khoi cua dung khoa loginNP/statNP — chu khong thay moi "port":9000 trong file,
# vi so do con xuat hien o cho khac.
if [ "${PUBLIC_SCHEME:-http}" = "https" ]; then
  GC="$S/console/store/global.conf.json"
  if [ -f "$GC" ]; then
    PORT="${PUBLIC_PORT:-443}" perl -0pi -e '
      my $port = $ENV{PORT};
      for my $key (qw(loginNP)) {
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
    ' "$GC" && echo "[tcg-entrypoint] loginNP -> https:${PUBLIC_PORT:-443} (statNP giu noi bo)"
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
