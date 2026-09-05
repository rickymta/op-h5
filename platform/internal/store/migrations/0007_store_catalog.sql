-- Cua hang: game_packages tro thanh danh muc day du (nhom, cach phat, noi dung, dieu kien),
-- game_grants ghi cach phat va giao dich hoan Xu. Thiet ke: docs/design-cua-hang.md.
--
-- Hai duong phat hang (grant_mode):
--   pay  = console /gm/pay/manual voi item_tid = ID muc nap (充值项) — game xu ly nhu mot lan
--          nap that: Nguyen Bao theo moc, x2 lan dau, diem VIP, the thang, quy, dac quyen...
--   mail = console /gm/mail/x/create voi `reward` dang "type:id:count#..." — thu kem qua,
--          khong tinh la nap (goi vat pham web tu dinh nghia).
-- category = nhom hien thi tren web; 'ingame' = khong hien, chi de tra gia khi mua trong game.

SET NAMES utf8mb4;

ALTER TABLE game_packages
  ADD COLUMN category       VARCHAR(16)  NOT NULL DEFAULT 'ingame' AFTER name,
  ADD COLUMN grant_mode     ENUM('pay','mail') NOT NULL DEFAULT 'pay' AFTER category,
  ADD COLUMN reward         VARCHAR(512) NULL AFTER item_name,
  ADD COLUMN description    VARCHAR(512) NULL AFTER reward,
  ADD COLUMN badge          VARCHAR(48)  NULL AFTER description,
  ADD COLUMN func_id        INT          NULL AFTER badge,
  ADD COLUMN shop_item_id   INT          NULL AFTER func_id,
  ADD COLUMN vip_points     BIGINT       NULL AFTER shop_item_id,
  ADD COLUMN server_day_min INT          NULL AFTER vip_points,
  ADD COLUMN server_day_max INT          NULL AFTER server_day_min,
  ADD COLUMN daily_limit    INT          NULL AFTER server_day_max,
  ADD COLUMN vip_required   INT          NULL AFTER daily_limit;

ALTER TABLE game_packages
  ADD KEY idx_pkg_cat (game_code, status, category, sort_order);

-- 'refunded': console tu choi phat (het luot, chua toi ngay...) -> hoan Xu tu dong, ghi
-- refund_txn_id de doi soat. 'ingame': game tu phat sau khi Adapter tra 'true' (khong qua worker).
ALTER TABLE game_grants
  MODIFY COLUMN status ENUM('pending','granted','failed','refunded') NOT NULL DEFAULT 'pending',
  ADD COLUMN grant_mode    ENUM('pay','mail','ingame') NOT NULL DEFAULT 'pay' AFTER package_id,
  ADD COLUMN reward        VARCHAR(512) NULL AFTER item_name,
  ADD COLUMN refund_txn_id BIGINT UNSIGNED NULL AFTER last_error;
