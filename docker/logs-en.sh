#!/usr/bin/env bash
# Xem log cua mot service bang TIENG ANH (dich luc doc, khong sua file goc).
#
#   ./docker/logs-en.sh game            # 200 dong cuoi
#   ./docker/logs-en.sh game -f         # theo doi truc tiep
#   ./docker/logs-en.sh game --error    # chi error.log
#   ./docker/logs-en.sh console -n 500
#
# Tren may co cum dang chay (server hoac dev). Tu tim ten container: `docker-<svc>-1`
# (compose) hoac `op-<svc>` (dev-macos.sh).
#
# Mat khau trong log duoc CHE truoc khi in — console in thang mat khau MySQL/Mongo vao
# info.log, ma log thi hay duoc copy vao bao cao.
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)

SVC="${1:-}"
[ -n "$SVC" ] || { echo "dung: $0 <console|world|meta|statistic|pay|group|game|login|cross> [-f] [--error] [-n N]" >&2; exit 1; }
shift

THEO=0; LOAI=info; SO=200
while [ $# -gt 0 ]; do
  case "$1" in
    -f|--follow) THEO=1 ;;
    --error)     LOAI=error ;;
    -n)          SO="${2:-200}"; shift ;;
    *)           echo "khong hieu tham so: $1" >&2; exit 1 ;;
  esac
  shift
done

# Ten container: compose dat `docker-<svc>-1`, dev-macos.sh dat `op-<svc>`.
CT=""
for ten in "docker-${SVC}-1" "op-${SVC}"; do
  if docker inspect "$ten" >/dev/null 2>&1; then CT="$ten"; break; fi
done
[ -n "$CT" ] || { echo "khong thay container cho '$SVC' (da thu docker-${SVC}-1 va op-${SVC})" >&2; exit 1; }

# game/cross/group co them mot cap thu muc theo instance.
DUONG=".logs/${LOAI}.log"
case "$SVC" in
  game|cross|group) DUONG=".logs/*/${LOAI}.log" ;;
esac

if [ "$THEO" = 1 ]; then
  docker exec "$CT" sh -c "tail -n $SO -F $DUONG 2>/dev/null" | python3 "$HERE/tools/log-en.py"
else
  docker exec "$CT" sh -c "tail -n $SO $DUONG 2>/dev/null" | python3 "$HERE/tools/log-en.py"
fi
