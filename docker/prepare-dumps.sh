#!/bin/bash
# CHAY TREN SERVER CU (pgaming) de lay du lieu mang sang Docker.
# Ket qua: /tmp/tcg-dumps/mysql/*.sql va /tmp/tcg-dumps/mongo/dump/
# Roi copy 2 thu muc do vao docker/initdb/mysql/ va docker/initdb/mongo/dump/.
#
# Chi tcg-game.jar co structure.sql (4 bang stat_* cua game_sX); cac DB tcg/stat/web/cdks
# va toan bo Mongo KHONG co schema trong JAR -> bat buoc phai dump tu server dang chay.
set -e
OUT=/tmp/tcg-dumps
MYSQL_PW="${MYSQL_PW:?export MYSQL_PW=<mat khau root mysql>}"
MONGO_USER="${MONGO_USER:-abc123}"
MONGO_PW="${MONGO_PW:?export MONGO_PW=<mat khau mongo>}"
mkdir -p "$OUT/mysql" "$OUT/mongo"

echo "== MySQL: liet ke database =="
mysql -uroot -p"$MYSQL_PW" -N -e "SHOW DATABASES" | grep -vE '^(information_schema|performance_schema|mysql|sys)$' | tee "$OUT/mysql-dbs.txt"
echo "== mysqldump (moi DB mot file, co CREATE DATABASE) =="
while read -r db; do
  mysqldump -uroot -p"$MYSQL_PW" --single-transaction --routines --triggers --events \
    --databases "$db" > "$OUT/mysql/$db.sql"
  echo "  $db -> $(du -h "$OUT/mysql/$db.sql" | cut -f1)"
done < "$OUT/mysql-dbs.txt"
# Thu tu import cua image mysql la theo ten file (a-z): dat tcg truoc cho chac
[ -f "$OUT/mysql/tcg.sql" ] && mv "$OUT/mysql/tcg.sql" "$OUT/mysql/00-tcg.sql"
# MySQL 8 tu choi ROW_FORMAT=COMPACT cua mysqldump 5.6 o bang nhieu cot varchar utf8mb4
# ("Row size too large (> 8126)", vd web.card_log). Image mysql nap dump TRUC TIEP (truoc
# zz-init.sh) nen phai sua ngay trong file dump; DYNAMIC khong doi ngu nghia du lieu.
sed -i 's/ROW_FORMAT=COMPACT/ROW_FORMAT=DYNAMIC/g' "$OUT"/mysql/*.sql
echo "  ROW_FORMAT=COMPACT -> DYNAMIC: $(grep -l 'ROW_FORMAT=DYNAMIC' "$OUT"/mysql/*.sql | wc -l) file"

echo "== mongodump (toan bo, co auth) =="
mongodump --host 127.0.0.1 --port 27017 -u "$MONGO_USER" -p "$MONGO_PW" --authenticationDatabase admin --out "$OUT/mongo/dump"
du -sh "$OUT/mongo/dump"

echo
echo "Xong. Tren may co Docker:"
echo "  scp -r root@<server-cu>:$OUT/mysql/*.sql  docker/initdb/mysql/"
echo "  scp -r root@<server-cu>:$OUT/mongo/dump   docker/initdb/mongo/"
