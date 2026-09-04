-- Bang goi quy doi, thay cho `website/game/api/id.txt` (1984 dong dang `payId;giaXu`
-- hardcode trong tang PHP cu).
--
-- Moi game co bang gia rieng: tuong quan giua Xu cua he thong ID va vat pham trong game
-- khong nhat thiet giong nhau giua cac game.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS game_packages (
  game_code   VARCHAR(32)  NOT NULL,
  package_id  VARCHAR(64)  NOT NULL,   -- ma goi, nguoi choi chon
  name        VARCHAR(128) NOT NULL,
  price_xu    BIGINT       NOT NULL,   -- gia tinh bang Xu cua he thong ID
  item_tid    INT          NOT NULL,   -- vat pham trong game (PayRecord.itemTid)
  item_count  INT          NOT NULL DEFAULT 1,
  item_name   VARCHAR(128) NOT NULL,
  status      ENUM('active','hidden') NOT NULL DEFAULT 'active',
  sort_order  INT          NOT NULL DEFAULT 0,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (game_code, package_id),
  KEY idx_pkg_active (game_code, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bo sung cho game_grants: tien trinh phat hang can biet phat CAI GI va cho AI,
-- va can mot moc thoi gian de gian cach thu lai thay vi quay lien tuc.
ALTER TABLE game_grants
  ADD COLUMN item_tid     INT         NOT NULL DEFAULT 0        AFTER package_id,
  ADD COLUMN item_count   INT         NOT NULL DEFAULT 1        AFTER item_tid,
  ADD COLUMN item_name    VARCHAR(128) NULL                     AFTER item_count,
  ADD COLUMN account_uid  VARCHAR(64) NULL                      AFTER user_id,
  ADD COLUMN next_retry_at DATETIME   NULL                      AFTER attempts;

-- Lay lenh dang cho theo thu tu cu nhat truoc, bo qua lenh chua toi luc thu lai.
ALTER TABLE game_grants
  ADD KEY idx_grant_due (game_code, status, next_retry_at);
