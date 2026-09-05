#!/bin/bash
# Chay TREN SERVER MOI (Ubuntu 20.04+/Debian 11+ hoac CentOS 7+/Rocky), quyen root.
#
#   MODE=build  (mac dinh)  cai Docker + git + git-lfs, clone repo (keo 8 JAR qua LFS ~611 MB),
#                           build 3 image NGAY TREN SERVER. Khong can GHCR, khong can CI.
#   MODE=pull               cai Docker, chi lay thu muc docker/ (khong git), pull image tu GHCR.
#
#   Chua co .env -> tu sinh bang gen-env.sh (moi bi mat ngau nhien) voi PUBLIC_HOST (bien moi truong,
#   khong co thi doan IP public). MySQL khoi tao tu bo seed sach trong git (initdb/mysql/seed/), KHONG
#   can dump tu server cu. Cuoi cung `compose up -d` luon; NO_UP=1 de dung truoc buoc do.
#
#   curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | PUBLIC_HOST=1.2.3.4 bash
#   curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | MODE=pull PUBLIC_HOST=1.2.3.4 bash
set -euo pipefail
REPO="${REPO:-rickymta/op-h5}"; BRANCH="${BRANCH:-main}"; BASE="${BASE:-/opt/tcg}"; MODE="${MODE:-build}"
COMPOSE="docker compose -f docker-compose.image.yml"

ensure_env() { # $1 = thu muc docker: tao .env neu chua co
  if [ -f "$1/.env" ]; then echo "  .env da co — giu nguyen (mat khau cu van khop volume DB cu)"; return 0; fi
  local host="${PUBLIC_HOST:-}"
  [ -n "$host" ] || host=$(curl -fsS -m 5 https://api.ipify.org 2>/dev/null || true)
  [ -n "$host" ] || host=$(hostname -I 2>/dev/null | awk '{print $1}')
  [ -n "$host" ] || { echo "  !! khong doan duoc IP public — chay lai voi PUBLIC_HOST=<ip>" >&2; exit 1; }
  echo "  PUBLIC_HOST=$host (khac thi chay lai voi PUBLIC_HOST=<ip-hoac-domain>)"
  bash "$1/gen-env.sh" "$host"
}

echo "== 1/7 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || { echo "Thieu docker compose plugin (Docker >= 24)"; exit 1; }
docker --version; docker compose version

echo "== 2/7 Swap 4 GB (may 8 GB RAM, bat buoc)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null; grep -q vm.swappiness /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
swapon --show

echo "== 3/7 Thu muc $BASE + tai nguyen client (res/ sound/ spine/ tu GitHub Release)"
mkdir -p "$BASE/assets"
ASSETS_URL="${ASSETS_URL:-https://github.com/$REPO/releases/download/assets-v1/client-assets.tar.gz}"
if [ -d "$BASE/assets/res" ] && [ "$(ls -A "$BASE/assets/res" 2>/dev/null | wc -l)" -gt 1000 ]; then
  echo "  assets da co ($(ls "$BASE/assets/res" | wc -l) file trong res/), bo qua tai"
elif curl -fsIL "$ASSETS_URL" >/dev/null 2>&1; then
  echo "  tai $ASSETS_URL (~1.5 GB)"
  curl -fL --retry 3 --progress-bar "$ASSETS_URL" | tar -xz -C "$BASE/assets"
  echo "  res: $(ls "$BASE/assets/res" | wc -l) file, sound: $(ls "$BASE/assets/sound" | wc -l), spine: $(ls "$BASE/assets/spine" | wc -l)"
else
  echo "  !! khong tai duoc $ASSETS_URL — rsync tu server cu hoac WinSCP (xem cuoi script)"
fi

if [ "$MODE" = "build" ]; then
  echo "== 4/7 git + git-lfs, clone $REPO (LFS ~611 MB — tinh vao quota 1 GB/thang)"
  if ! command -v git >/dev/null 2>&1 || ! command -v git-lfs >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then apt-get update -qq && apt-get install -y -qq git git-lfs rsync >/dev/null
    elif command -v dnf >/dev/null 2>&1; then dnf install -y -q git git-lfs rsync
    else yum install -y -q epel-release >/dev/null 2>&1 || true; yum install -y -q git git-lfs rsync; fi
  fi
  git lfs install --skip-repo
  if [ -d "$BASE/src/.git" ]; then git -C "$BASE/src" pull --ff-only; git -C "$BASE/src" lfs pull
  else git clone --branch "$BRANCH" "https://github.com/$REPO.git" "$BASE/src"; fi
  ls -la "$BASE/src/server/statistic/"*.jar | awk '{print "  JAR:", $5, "bytes", $9}'   # phai ~104 MB, khong phai 130 byte (LFS pointer)
  DOCKER_DIR="$BASE/src/docker"
  echo "== 5/7 .env + build image tren server (server/php/nginx chi COPY ~3-5 phut; id/adapter/admin compile Go ~2-4 phut)"
  ensure_env "$DOCKER_DIR"
  ( cd "$DOCKER_DIR" && $COMPOSE -f docker-compose.platform.yml build console php nginx id adapter admin )
  docker images | grep -E 'op-h5-(server|php|nginx|id|adapter|admin)' | awk '{print "  image:", $1":"$2, $NF}'
else
  echo "== 4/7 Lay thu muc docker/ tu tarball (khong can git)"
  mkdir -p "$BASE/docker"; TMP=$(mktemp -d)
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" | tar -xz -C "$TMP" --wildcards "*/docker/*"
  cp -a "$TMP"/*/docker/. "$BASE/docker/"; rm -rf "$TMP"
  DOCKER_DIR="$BASE/docker"
  echo "== 5/7 .env (pull image o buoc 7)"
  ensure_env "$DOCKER_DIR"
fi
chmod +x "$DOCKER_DIR"/*.sh "$DOCKER_DIR"/initdb/mongo/*.sh 2>/dev/null || true

echo "== 6/7 Port tren host phai ranh (host network)"
for p in 80 3306 27017 5672 9999 9000 12345 7788 10010 10086 30001 20001 8001 18001 9001 8080 8090 8100; do
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p\$" && echo "  !! port $p dang bi chiem" || true
done

if [ "${NO_UP:-0}" = 1 ]; then
  echo "== 7/7 bo qua (NO_UP=1). Khi san sang: cd $DOCKER_DIR && $( [ "$MODE" = pull ] && echo "$COMPOSE pull && " )$COMPOSE up -d"
else
  echo "== 7/7 Khoi dong toan bo (console -> world -> meta -> statistic -> pay -> group -> game -> login -> cross -> web; 5-8 phut)"
  cd "$DOCKER_DIR"
  [ "$MODE" = pull ] && $COMPOSE pull
  $COMPOSE up -d
  for i in $(seq 1 60); do
    sleep 10
    if curl -fsS -m 5 -o /dev/null http://127.0.0.1/ 2>/dev/null && curl -fsS -m 5 -o /dev/null http://127.0.0.1:9000/ 2>/dev/null; then
      echo "  web + login da len sau $((i * 10))s"; break
    fi
    [ $((i % 6)) -eq 0 ] && $COMPOSE ps --format '  {{.Name}}: {{.Status}}' 2>/dev/null | grep -vE 'healthy\)' || true
  done
  $COMPOSE ps
fi

H=$(grep '^PUBLIC_HOST=' "$DOCKER_DIR/.env" | cut -d= -f2- | sed 's/ *#.*//')
cat <<EOF

XONG. Nguoi choi vao:  http://$H/          (dang ky o http://$H:8080, vao game tai /choi-game)
  Trang quan tri:   ssh -L 8100:127.0.0.1:8100 root@<server>  ->  http://127.0.0.1:8100   (tai khoan: xem ADMIN_BOOTSTRAP_* trong $DOCKER_DIR/.env)
  Console/GM tool:  admin / CONSOLE_ADMIN_PASSWORD trong .env
  Firewall mo: 80, 8080 (he thong ID), 9000, 8001, 12345, 7788. 8090/8100 chi loopback.
  Kiem tra:  cd $DOCKER_DIR && $COMPOSE ps && $COMPOSE logs game | grep -E '找不到excel|加载错误|OutOfMemory'

Tuy chon:
  * Giu tai khoan/nhan vat cu: dump tren server cu (docker/prepare-dumps.sh), rsync vao
      $DOCKER_DIR/initdb/mysql/  va  $DOCKER_DIR/initdb/mongo/dump/
    roi  $COMPOSE down -v && $COMPOSE up -d   (zz-init.sh tu dien mat khau .env vao dump, khong can khop mat khau cu)
  * Tai nguyen client thieu: rsync -avz root@<server-cu>:/www/wwwroot/game/{res,sound,spine} $BASE/assets/
  * Nap the/MoMo/bank, email: dien THESIEUTOC_API_KEY, MOMO_*, BANK_CALLBACK_CHECKSUM, ID_SMTP_* trong .env roi $COMPOSE up -d php id
EOF
