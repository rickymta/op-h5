-- Phieu dat lai mat khau.
--
-- Chi luu BAM cua ma, khong luu ma goc: lo mot ban dump DB khong dong nghia voi viec
-- dat lai duoc mat khau cua moi nguoi. Dung mot lan (used_at) va het han nhanh.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash CHAR(64)        NOT NULL,   -- sha256 hex cua ma gui qua email
  user_id    BIGINT UNSIGNED NOT NULL,
  ip         VARBINARY(16)   NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME        NULL,
  PRIMARY KEY (token_hash),
  KEY idx_reset_user (user_id, created_at),
  KEY idx_reset_expiry (expires_at),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
