-- Tai khoan quan tri, tach hoan toan khoi tai khoan nguoi choi.
--
-- Vi sao khong dung chung bang users: quyen quan tri va tai khoan choi game co vong
-- doi, chinh sach mat khau va be mat tan cong khac nhau. Tron chung la cach mot lo
-- hong o cong nguoi choi tro thanh quyen GM.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(64)     NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('viewer','operator','owner') NOT NULL DEFAULT 'viewer',
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  last_login_at DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id         CHAR(43)        NOT NULL,
  admin_id   BIGINT UNSIGNED NOT NULL,
  ip         VARBINARY(16)   NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME        NOT NULL,
  revoked_at DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_admin_sessions_admin (admin_id),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nhat ky thao tac: cong cu GM cu chi duoc bao ve bang mot chuoi tinh va khong ghi lai
-- ai lam gi. Moi thay doi cau hinh o day deu de lai vet.
CREATE TABLE IF NOT EXISTS admin_audit (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id   BIGINT UNSIGNED NULL,
  action     VARCHAR(64)     NOT NULL,
  target     VARCHAR(190)    NOT NULL,
  detail     TEXT            NULL,
  ip         VARBINARY(16)   NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_time (created_at),
  KEY idx_audit_admin (admin_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Danh sach game de trang quan tri biet hoi Adapter nao. Them game moi = them mot dong.
CREATE TABLE IF NOT EXISTS games (
  code        VARCHAR(32)  NOT NULL,
  name        VARCHAR(64)  NOT NULL,
  adapter_url VARCHAR(190) NOT NULL,   -- vd http://127.0.0.1:8090
  site_url    VARCHAR(190) NULL,       -- vd https://haitac.example.com
  status      ENUM('active','hidden') NOT NULL DEFAULT 'active',
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
