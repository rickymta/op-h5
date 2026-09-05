Thu muc nay duoc mount vao /docker-entrypoint-initdb.d cua image mysql:8.0 va CHI chay MOT LAN,
luc volume mysql-data con trong (lam lai: docker compose down -v roi up). Thu tu xu ly theo ten file.

  seed/*.sql     Bo seed SACH, nam trong git. Schema day du 4 DB (tcg, stat, web, cdks) + dong cau hinh
                 toi thieu de cum game chay (srv_game s1, srv_group/device, srv_cross, cloud_*, app,
                 srv_game_access, staff admin...). Mat khau/host la placeholder __X__.
                 Sinh boi: python tools/dump-to-seed.py  (tu dump that, tu kiem chung khong lot bi mat).
                 Image mysql BO QUA thu muc con, nen seed chi duoc nap qua zz-init.sh.

  *.sql          (tuy chon, gitignored) dump THAT tu server cu — docker/prepare-dumps.sh. Dat vao day
                 (00-tcg.sql, stat.sql, web.sql, cdks.sql, game_s1.sql) neu muon giu tai khoan/du lieu cu.
                 Co dump thi seed KHONG duoc nap. Mat khau trong dump KHONG can khop .env (xem duoi).

  zz-init.sh     Chay sau cung. Khong thay tcg.srv_game -> nap seed/. Roi voi CA HAI truong hop:
                 ghi MYSQL/MONGO/RABBITMQ password vao tcg.cloud_* (game/cross/group doc credential o
                 day), CONSOLE_ADMIN_PASSWORD vao tcg.staff, PUBLIC_HOST vao cloud_device + srv_login,
                 url cross/group -> 127.0.0.1, tat gioi han srv_game_access, them may chu theo GAME_SERVERS.
                 Bien lay tu .env qua compose (service mysql). Thieu bien -> dung ngay, bao ro.

DB game_sX khong can seed: tcg-game.jar tu tao (structure.sql). Mongo cung khong can dump: service tu
tao collection (docker/initdb/mongo/restore.sh chi restore khi co dump/).
