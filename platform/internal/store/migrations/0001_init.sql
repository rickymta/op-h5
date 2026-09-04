-- Schema cua he thong ID (database `platform`). Tach hoan toan khoi `web` va `tcg`.
--
-- Nguyen tac:
--   - Mat khau chi luu duoi dang bam Argon2id, khong bao gio luu ban thô.
--   - So du vi KHONG phai mot cot cong tru duoc: no la tong cua so cai ghi kep.
--   - Moi thao tac tien co idempotency_key de goi lai khong bi tru/phat hai lan.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------- danh tinh

CREATE TABLE IF NOT EXISTS users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username        VARCHAR(32)     NOT NULL,
  email           VARCHAR(190)    NULL,
  phone           VARCHAR(20)     NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  status          ENUM('active','locked','deleted') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME      NULL,
  last_login_at   DATETIME        NULL,
  last_login_ip   VARBINARY(16)   NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Noi tai khoan cu ben web.user sang users. Dung khi di tru: lan dang nhap dau tien
-- sau khi chuyen, ID doi chieu voi mat khau cu roi bam lai va ghi dong o day.
CREATE TABLE IF NOT EXISTS user_legacy_links (
  user_id         BIGINT UNSIGNED NOT NULL,
  legacy_source   VARCHAR(32)     NOT NULL,   -- 'web.user'
  legacy_username VARCHAR(64)     NOT NULL,
  migrated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (legacy_source, legacy_username),
  KEY idx_legacy_user (user_id),
  CONSTRAINT fk_legacy_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Phien trinh duyet tai id.domain.com (khong phai token cua game).
CREATE TABLE IF NOT EXISTS sessions (
  id           CHAR(43)        NOT NULL,      -- 32 byte ngau nhien, base64url
  user_id      BIGINT UNSIGNED NOT NULL,
  ip           VARBINARY(16)   NULL,
  user_agent   VARCHAR(255)    NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME        NOT NULL,
  revoked_at   DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chong do mat khau: dem theo ca tai khoan lan IP.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scope      ENUM('username','ip') NOT NULL,
  scope_key  VARCHAR(190)    NOT NULL,
  succeeded  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attempts_lookup (scope, scope_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------- OIDC

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id          VARCHAR(64)  NOT NULL,   -- vd 'haitac'
  name               VARCHAR(128) NOT NULL,
  secret_hash        VARCHAR(255) NULL,       -- NULL = client cong khai (chi PKCE)
  redirect_uris      TEXT         NOT NULL,   -- moi dong mot URI, so khop tuyet doi
  post_logout_uris   TEXT         NULL,
  scopes             VARCHAR(255) NOT NULL DEFAULT 'openid profile wallet',
  require_pkce       TINYINT(1)   NOT NULL DEFAULT 1,
  status             ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ma uy quyen dung mot lan. Chi luu bam, va co consumed_at de phat hien dung lai.
CREATE TABLE IF NOT EXISTS oauth_auth_codes (
  code_hash            CHAR(64)        NOT NULL,   -- sha256 hex cua ma
  client_id            VARCHAR(64)     NOT NULL,
  user_id              BIGINT UNSIGNED NOT NULL,
  redirect_uri         VARCHAR(512)    NOT NULL,
  scope                VARCHAR(255)    NOT NULL,
  nonce                VARCHAR(128)    NULL,
  code_challenge       VARCHAR(128)    NOT NULL,
  code_challenge_method VARCHAR(8)     NOT NULL DEFAULT 'S256',
  expires_at           DATETIME        NOT NULL,
  consumed_at          DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code_hash),
  KEY idx_codes_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  token_hash  CHAR(64)        NOT NULL,
  client_id   VARCHAR(64)     NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  scope       VARCHAR(255)    NOT NULL,
  expires_at  DATETIME        NOT NULL,
  revoked_at  DATETIME        NULL,
  rotated_to  CHAR(64)        NULL,           -- xoay vong: token moi thay the token nay
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_refresh_user (user_id),
  KEY idx_refresh_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------- vi & so cai
--
-- Ghi kep: moi giao dich sinh >= 2 dong ledger_entries co tong dai so bang 0.
-- So du cua mot tai khoan = SUM(amount) cua cac dong tro toi no.
-- Quy uoc dau: amount > 0 la ghi CO (tang), amount < 0 la ghi NO (giam).

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind        ENUM('user','system') NOT NULL,
  user_id     BIGINT UNSIGNED NULL,           -- NULL khi kind='system'
  code        VARCHAR(64)     NULL,           -- vd 'gateway_clearing', 'game_revenue'
  currency    CHAR(3)         NOT NULL DEFAULT 'XU',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_user (user_id, currency),
  UNIQUE KEY uq_wallet_system (code, currency),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ledger_txns (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind            ENUM('topup','convert','adjust','refund') NOT NULL,
  idempotency_key VARCHAR(128)    NOT NULL,
  reference       VARCHAR(190)    NULL,       -- ma don ben ngoai (the cao, bank, momo)
  memo            VARCHAR(255)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_txn_idem (idempotency_key),
  KEY idx_txn_kind_time (kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  txn_id     BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  amount     BIGINT          NOT NULL,        -- don vi nho nhat, co dau
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_entries_account (account_id, id),
  KEY idx_entries_txn (txn_id),
  CONSTRAINT fk_entries_txn FOREIGN KEY (txn_id) REFERENCES ledger_txns(id),
  CONSTRAINT fk_entries_account FOREIGN KEY (account_id) REFERENCES wallet_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lenh phat hang sang game. ID tru vi truoc, roi goi game; game phat xong ghi ket qua.
CREATE TABLE IF NOT EXISTS game_grants (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  txn_id          BIGINT UNSIGNED NOT NULL,
  game_code       VARCHAR(32)     NOT NULL,
  srv_code        VARCHAR(32)     NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  role_id         VARCHAR(64)     NULL,
  package_id      VARCHAR(64)     NOT NULL,
  amount_xu       BIGINT          NOT NULL,
  status          ENUM('pending','granted','failed') NOT NULL DEFAULT 'pending',
  attempts        INT             NOT NULL DEFAULT 0,
  last_error      VARCHAR(512)    NULL,
  granted_at      DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grant_txn (txn_id),
  KEY idx_grant_status (status, created_at),
  CONSTRAINT fk_grant_txn FOREIGN KEY (txn_id) REFERENCES ledger_txns(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------- doi server & tai
--
-- Nguong tai khong luu trong tcg.srv_game vi login server khong doc playerMax
-- (da kiem chung trong bytecode). Adapter doc bang nay; trang quan tri sua bang nay
-- roi dong bo nguoc vao srv_game.player_max cho cac cong cu GM san co nhin thay.

CREATE TABLE IF NOT EXISTS game_servers (
  game_code    VARCHAR(32) NOT NULL,          -- 'haitac'
  srv_code     VARCHAR(32) NOT NULL,          -- 's1'
  name         VARCHAR(64) NOT NULL,
  device_code  VARCHAR(32) NOT NULL,
  ws_port      INT         NOT NULL,
  soft_limit   INT         NOT NULL DEFAULT 800,   -- N: nguong mem
  overflow_pct INT         NOT NULL DEFAULT 15,    -- r: bien tran, chan o N*(1+r/100)
  recommend    TINYINT(1)  NOT NULL DEFAULT 1,
  status       ENUM('running','maintain','closed','merged') NOT NULL DEFAULT 'running',
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (game_code, srv_code),
  KEY idx_srv_device (game_code, device_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tran cua ca mot may vat ly: hai server deu con cho nhung cong lai vuot suc may.
CREATE TABLE IF NOT EXISTS game_devices (
  game_code   VARCHAR(32) NOT NULL,
  device_code VARCHAR(32) NOT NULL,
  name        VARCHAR(64) NOT NULL,
  max_online  INT         NOT NULL DEFAULT 1600,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (game_code, device_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Anh xa nguoi dung ID -> tai khoan game. Adapter giu mot khoa rieng cho moi cap
-- (user, game): mat khau that cua nguoi choi khong bao gio toi cum game.
CREATE TABLE IF NOT EXISTS game_identities (
  user_id       BIGINT UNSIGNED NOT NULL,
  game_code     VARCHAR(32)     NOT NULL,
  game_username VARCHAR(64)     NOT NULL,     -- username trong tcg.account
  game_secret   VARBINARY(255)  NOT NULL,     -- khoa Adapter tu sinh, ma hoa truoc khi luu
  account_uid   VARCHAR(64)     NULL,         -- tcg.account.uid sau lan dang nhap dau
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, game_code),
  UNIQUE KEY uq_game_username (game_code, game_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
