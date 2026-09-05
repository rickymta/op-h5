-- Tai khoan cho GM tool (website/game/gmhanglong, gm).
--
-- VI SAO CAN BANG NAY
-- -------------------
-- GM tool cu khong co tai khoan: no so mot CHUOI TINH nam trong config
-- (`$sqm != $gm_code`, `$checknum != $gmcode`). Ai biet chuoi do la co toan quyen GM —
-- phat vat pham, gui thu toan server, sinh CDK, nap tay — va khong co dau vet ai lam gi.
-- Chuoi do lai nam trong file cau hinh cua mot repo cong khai (dang placeholder), va doi
-- no thi phai sua file roi trien khai lai.
--
-- Bang nay thay chuoi do bang tai khoan that: mat khau BAM, co the khoa tung nguoi, va
-- moi thao tac deu ghi lai.
--
-- CHON BCRYPT chu khong phai Argon2id (du PHP 7.4 o day co ca hai): tang PHP ghi va doc
-- bang password_hash/password_verify, con `identity.VerifyPassword` ben Go da doc duoc
-- bcrypt (them cho luong di tru nguoi choi cu). Mot bang, hai phia deu dung duoc, khong
-- ai phai cai them gi.
CREATE TABLE IF NOT EXISTS gm_users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(64)     NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,   -- bcrypt: $2y$...
  display_name  VARCHAR(64)     NULL,
  -- 'gm' lam duoc cac thao tac trong game; 'owner' them quyen quan ly tai khoan GM khac.
  role          ENUM('gm','owner') NOT NULL DEFAULT 'gm',
  status        ENUM('active','locked') NOT NULL DEFAULT 'active',
  -- Dem sai lien tiep. Khoa tam khi vuot nguong; dat lai ve 0 khi dang nhap dung.
  failed_count  INT UNSIGNED    NOT NULL DEFAULT 0,
  locked_until  DATETIME        NULL,
  last_login_at DATETIME        NULL,
  last_login_ip VARBINARY(16)   NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gm_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nhat ky thao tac GM.
--
-- Cac viec GM lam deu tao ra gia tri trong game (vat pham, tien, CDK). Khong ghi lai thi
-- khi co tranh chap — hoac khi mot tai khoan GM bi chiem — khong the biet chuyen gi da
-- xay ra. Bang nay chi GHI THEM, khong sua.
CREATE TABLE IF NOT EXISTS gm_audit (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gm_user_id BIGINT UNSIGNED NULL,          -- NULL = that bai truoc khi biet la ai
  username   VARCHAR(64)     NOT NULL,      -- chep lai, de xoa tai khoan van con dau vet
  action     VARCHAR(64)     NOT NULL,      -- 'login', 'login_failed', 'cdk_create', ...
  target     VARCHAR(190)    NULL,          -- srvCode/roleName/... tuy thao tac
  detail     TEXT            NULL,          -- JSON ngan; KHONG chua mat khau hay token
  ip         VARBINARY(16)   NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gm_audit_time (created_at),
  KEY idx_gm_audit_user (gm_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
