Dat cac file *.sql tu `docker/prepare-dumps.sh` (mysqldump --databases ...) vao day.
Image mysql chay chung MOT LAN khi volume mysql-data con trong, theo thu tu ten file (a-z).
tcg.sql da duoc doi ten 00-tcg.sql de import truoc stat/web/cdks.
Muon import lai: `docker compose down -v` (xoa volume) roi `up` lai.
