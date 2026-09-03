#!/bin/bash
# Chay tu dong boi image mongo o LAN DAU khoi tao volume (docker-entrypoint-initdb.d).
# Luc nay mongod tam thoi chay khong auth tren localhost, nen mongorestore khong can user.
# Dat ket qua `mongodump` (thu muc dump/ chua tcg/, statistic/, cross-yzx1/, ...) vao
# docker/initdb/mongo/dump/ truoc khi `docker compose up` lan dau.
set -e
DUMP=/docker-entrypoint-initdb.d/dump
if [ -d "$DUMP" ] && [ -n "$(ls -A "$DUMP" 2>/dev/null)" ]; then
  echo "[restore] mongorestore tu $DUMP"
  mongorestore --host 127.0.0.1 --port 27017 --drop "$DUMP"
  echo "[restore] xong"
else
  echo "[restore] khong co $DUMP — bo qua (DB rong, server se tu tao collection)"
fi
