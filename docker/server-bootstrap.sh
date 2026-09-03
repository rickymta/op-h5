#!/bin/bash
# Chay TREN SERVER MOI (Ubuntu 20.04+/Debian 11+ hoac CentOS 7+/Rocky), quyen root.
# Cai Docker + compose plugin, tao /opt/tcg, lay thu muc docker/ tu GitHub (khong can git-lfs
# vi chi lay file cau hinh, khong lay JAR), tao swap 4 GB. Sau do ban dien .env, upload
# assets + dump, roi `docker compose -f docker-compose.image.yml pull && up -d`.
#
#   curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | bash
set -euo pipefail
REPO="${REPO:-rickymta/op-h5}"; BRANCH="${BRANCH:-main}"; BASE="${BASE:-/opt/tcg}"

echo "== 1/5 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || { echo "Thieu docker compose plugin (Docker >= 24). Cai: apt install docker-compose-plugin"; exit 1; }
docker --version; docker compose version

echo "== 2/5 Swap 4 GB (may 8 GB RAM, bat buoc)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null; grep -q vm.swappiness /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
swapon --show

echo "== 3/5 Thu muc $BASE"
mkdir -p "$BASE/assets" "$BASE/docker"
# lay docker/ tu tarball nhanh (JAR trong tarball chi la LFS pointer, nhung ta khong dung)
TMP=$(mktemp -d)
curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" | tar -xz -C "$TMP" --wildcards "*/docker/*"
cp -a "$TMP"/*/docker/. "$BASE/docker/"; rm -rf "$TMP"
chmod +x "$BASE"/docker/*.sh "$BASE"/docker/initdb/mongo/*.sh 2>/dev/null || true
[ -f "$BASE/docker/.env" ] || cp "$BASE/docker/.env.example" "$BASE/docker/.env"
ls "$BASE/docker"

echo "== 4/5 Kiem tra port tren host (phai ranh vi dung host network)"
for p in 80 3306 27017 5672 9999 9000 12345 7788 10010 10086 30001 20001 8001 18001 9001; do
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p\$" && echo "  !! port $p dang bi chiem" || true
done

echo "== 5/5 Viec con lai (thu cong)"
cat <<EOF
  1) nano $BASE/docker/.env            # PUBLIC_HOST + tat ca secrets
  2) Upload (WinSCP/rsync) tu may Windows:
       website/game/res   -> $BASE/assets/res
       website/game/sound -> $BASE/assets/sound
       website/game/spine -> $BASE/assets/spine
       dump MySQL *.sql   -> $BASE/docker/initdb/mysql/
       dump Mongo dump/   -> $BASE/docker/initdb/mongo/dump/
  3) cd $BASE/docker
     docker compose -f docker-compose.image.yml pull     # neu bi 401: package tren GHCR chua public -> docker login ghcr.io
     docker compose -f docker-compose.image.yml up -d mysql mongo rabbitmq && sleep 60
     docker compose -f docker-compose.image.yml up -d
     watch -n5 'docker compose -f docker-compose.image.yml ps'
EOF
