#!/bin/bash
# Chay TREN SERVER MOI (Ubuntu 20.04+/Debian 11+ hoac CentOS 7+/Rocky), quyen root.
#
#   MODE=build  (mac dinh)  cai Docker + git + git-lfs, clone repo (keo 8 JAR qua LFS ~611 MB),
#                           build 3 image NGAY TREN SERVER. Khong can GHCR, khong can CI.
#   MODE=pull               cai Docker, chi lay thu muc docker/ (khong git), pull image tu GHCR.
#
#   curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | MODE=pull bash
set -euo pipefail
REPO="${REPO:-rickymta/op-h5}"; BRANCH="${BRANCH:-main}"; BASE="${BASE:-/opt/tcg}"; MODE="${MODE:-build}"
COMPOSE="docker compose -f docker-compose.image.yml"

echo "== 1/6 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || { echo "Thieu docker compose plugin (Docker >= 24)"; exit 1; }
docker --version; docker compose version

echo "== 2/6 Swap 4 GB (may 8 GB RAM, bat buoc)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null; grep -q vm.swappiness /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
swapon --show

echo "== 3/6 Thu muc $BASE + tai nguyen client (res/ sound/ spine/ tu GitHub Release)"
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
  echo "== 4/6 git + git-lfs, clone $REPO (LFS ~611 MB — tinh vao quota 1 GB/thang)"
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
  echo "== 5/6 Build image tren server (khong compile, chi COPY; ~3-5 phut)"
  [ -f "$DOCKER_DIR/.env" ] || cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
  ( cd "$DOCKER_DIR" && $COMPOSE build console php nginx )
  docker images | grep -E 'op-h5-(server|php|nginx)' | awk '{print "  image:", $1":"$2, $NF}'
else
  echo "== 4/6 Lay thu muc docker/ tu tarball (khong can git)"
  mkdir -p "$BASE/docker"; TMP=$(mktemp -d)
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" | tar -xz -C "$TMP" --wildcards "*/docker/*"
  cp -a "$TMP"/*/docker/. "$BASE/docker/"; rm -rf "$TMP"
  DOCKER_DIR="$BASE/docker"
  [ -f "$DOCKER_DIR/.env" ] || cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
  echo "== 5/6 (pull image o buoc cuoi, sau khi dien .env)"
fi
chmod +x "$DOCKER_DIR"/*.sh "$DOCKER_DIR"/initdb/mongo/*.sh 2>/dev/null || true

echo "== 6/6 Port tren host phai ranh (host network)"
for p in 80 3306 27017 5672 9999 9000 12345 7788 10010 10086 30001 20001 8001 18001 9001; do
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p\$" && echo "  !! port $p dang bi chiem" || true
done

cat <<EOF

XONG phan tu dong. Con lai (thu cong):
  1) nano $DOCKER_DIR/.env                  # PUBLIC_HOST + secrets (gia tri that o may ban: _backup-secrets-original/)
  2) Tai nguyen client vao $BASE/assets/{res,sound,spine}  — nhanh nhat la rsync tu server cu:
       rsync -avz --progress root@<server-cu>:/www/wwwroot/game/res   $BASE/assets/
       rsync -avz --progress root@<server-cu>:/www/wwwroot/game/sound $BASE/assets/
       rsync -avz --progress root@<server-cu>:/www/wwwroot/game/spine $BASE/assets/
  3) Dump DB tu server cu (docker/prepare-dumps.sh) roi rsync:
       rsync -avz root@<server-cu>:/tmp/tcg-dumps/mysql/       $DOCKER_DIR/initdb/mysql/
       rsync -avz root@<server-cu>:/tmp/tcg-dumps/mongo/dump/  $DOCKER_DIR/initdb/mongo/dump/
  4) cd $DOCKER_DIR
       $( [ "$MODE" = pull ] && echo "$COMPOSE pull" || echo "# image da build o buoc 5" )
       $COMPOSE up -d mysql mongo rabbitmq && sleep 60
       $COMPOSE up -d
       watch -n5 '$COMPOSE ps'
EOF
