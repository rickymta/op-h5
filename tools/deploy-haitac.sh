#!/usr/bin/env bash
# Đẩy bản client / PHP / Excel lên máy chủ haitac (157.66.218.20) từ PC — Git Bash trên Windows cũng chạy.
#
#   tools/deploy-haitac.sh --check     # chỉ kiểm tra kết nối và liệt kê việc sẽ làm
#   tools/deploy-haitac.sh             # git push + upload res mới theo manifest + build lại nginx/php trên máy chủ
#   tools/deploy-haitac.sh --excel     # thêm: copy server/excel/release vào container game rồi restart game (~2 phút rớt mạng)
#   tools/deploy-haitac.sh --no-push   # không git push (đã push rồi)
#
# Cần một lần: khoá ~/.ssh/haitac (tools/deploy-haitac.sh --check in ra cách cài) nằm trong
# /root/.ssh/authorized_keys của máy chủ, và ~/.ssh/config có "Host haitac" (đã tạo 2026-09-10).
#
# Vì sao làm như vậy (docs/deploy-runbook.md, CLAUDE.md mục 15):
#   - libs/, play.php, manifest nằm TRONG image op-h5-nginx / op-h5-php, máy chủ build từ clone
#     /opt/tcg/src (MODE=build) → phải push rồi `git pull` + `up -d --build nginx php`.
#   - res/ (1,5 GB) không nằm trong git/image: file mới (tên băm theo nội dung, phat-hanh-res.py)
#     chỉ cần chép vào ASSETS_DIR/res; file cũ giữ lại để người chơi cache cũ vẫn chạy.
#   - Đã bật domain nên mọi lệnh `up` phải kèm docker-compose.domain.yml (đã dính 2026-09-07).
#   - Excel máy chủ: KHÔNG gọi /srv/game/cmd/excel/reload (OOM, 2026-09-06) — docker cp rồi restart game.
set -euo pipefail
HOST=${HOST:-haitac}
ASSETS=${ASSETS:-/opt/tcg/assets}
SRC=${SRC:-/opt/tcg/src}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MANIFEST="$ROOT/website/game/libs/2af72-f100c-2af72.json"
CHECK=0; PUSH=1; EXCEL=0
for a in "$@"; do case "$a" in
  --check) CHECK=1;; --no-push) PUSH=0;; --excel) EXCEL=1;;
  *) echo "tham số lạ: $a" >&2; exit 2;;
esac; done

say() { printf '\n== %s\n' "$*"; }
remote() { ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" "$@"; }

say "kết nối $HOST"
if ! remote 'echo "ok $(hostname) $(date +%F_%T)"'; then
  cat >&2 <<EOF
!! không SSH được tới $HOST bằng khoá ~/.ssh/haitac. Cài khoá MỘT lần (cần mật khẩu root, hoặc chạy
   từ máy Mac đang có quyền vào), rồi chạy lại:
     ssh root@157.66.218.20 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys' < ~/.ssh/haitac.pub
EOF
  exit 1
fi

# --- 1. res mới theo manifest: file manifest trỏ tới, có ở PC mà chưa có trên máy chủ ---
say "res theo manifest"
LOCAL_RES=$(python - "$MANIFEST" "$ROOT/website/game" <<'PY'
import json, os, sys, zlib
man = json.loads(zlib.decompress(open(sys.argv[1], "rb").read()))
for k, v in man.items():
    if isinstance(v, str) and v.startswith("res/") and os.path.exists(os.path.join(sys.argv[2], v)):
        print(v[4:])
PY
)
REMOTE_RES=$(remote "ls $ASSETS/res 2>/dev/null" || true)
# python trên Windows in CRLF, và comm cần cùng thứ tự với sort -> bỏ \r, sort theo C
MISSING=$(comm -23 <(printf '%s\n' "$LOCAL_RES" | tr -d '\r' | LC_ALL=C sort -u) \
                   <(printf '%s\n' "$REMOTE_RES" | tr -d '\r' | LC_ALL=C sort -u) || true)
if [ -z "$MISSING" ]; then echo "  không có res mới"; else printf '  thiếu trên máy chủ:\n%s\n' "$MISSING"; fi

# --- 2. git ---
say "git"
BR=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)
DIRTY=$(git -C "$ROOT" status --porcelain | grep -v '^?? ' | grep -v 'server/excel/release' || true)
[ -n "$DIRTY" ] && echo "  !! cây làm việc còn thay đổi chưa commit (máy chủ chỉ lấy commit đã push):" && echo "$DIRTY" | head -10
AHEAD=$(git -C "$ROOT" rev-list --count "origin/$BR..$BR" 2>/dev/null || echo '?')
echo "  nhánh $BR, đi trước origin $AHEAD commit"

[ "$EXCEL" = 1 ] && say "excel: sẽ copy $(ls "$ROOT/server/excel/release" | wc -l) file vào container game rồi restart game"
if [ "$CHECK" = 1 ]; then say "chỉ kiểm tra — dừng"; exit 0; fi

# --- thực hiện ---
if [ -n "$MISSING" ]; then
  say "upload res"
  for f in $MISSING; do scp -q "$ROOT/website/game/res/$f" "$HOST:$ASSETS/res/$f" && echo "  + $f"; done
fi
if [ "$PUSH" = 1 ]; then say "git push"; git -C "$ROOT" push origin "$BR"; fi

say "máy chủ: git pull + build nginx/php"
remote "set -e; cd $SRC && git pull --ff-only && git lfs pull; cd docker;
  OV=''; [ -f docker-compose.domain.yml ] && OV='-f docker-compose.domain.yml';
  docker compose -f docker-compose.image.yml \$OV up -d --build nginx php;
  docker compose -f docker-compose.image.yml \$OV ps nginx php"

if [ "$EXCEL" = 1 ]; then
  say "excel -> container game + restart"
  tar czf - -C "$ROOT/server/excel" release | remote "set -e; rm -rf /tmp/excel-deploy && mkdir -p /tmp/excel-deploy && tar xzf - -C /tmp/excel-deploy;
    cd $SRC/docker; OV=''; [ -f docker-compose.domain.yml ] && OV='-f docker-compose.domain.yml';
    C=\$(docker compose -f docker-compose.image.yml \$OV ps -q game);
    docker cp /tmp/excel-deploy/release/. \$C:/h5/server/excel/release/ && docker restart \$C && echo '  game restarted'"
fi
say "xong"
