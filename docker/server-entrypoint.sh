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
if grep -rqE '__[A-Z_]+__' $CFG 2>/dev/null; then
  echo "[tcg-entrypoint] CANH BAO: van con placeholder:" >&2
  grep -rnoE '__[A-Z_]+__' $CFG >&2 || true
fi
# logback ghi vao .logs/ tuong doi voi working_dir; tao truoc de tranh loi quyen
mkdir -p "$(pwd)/.logs"
echo "[tcg-entrypoint] $(basename "$(pwd)") -> PUBLIC_HOST=$PUBLIC_HOST; exec: $*"
exec "$@"
