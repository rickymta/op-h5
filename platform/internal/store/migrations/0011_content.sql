-- Noi dung tinh sua duoc o trang quan tri, va chong do mat khau cho trang quan tri.
--
-- pages: cac trang chu yeu la chu (gioi thieu, huong dan, dieu khoan, chinh sach, FAQ, ho tro).
--   `game_code = ''` la trang CHUNG cua nen tang; `game_code = '<ma game>'` la ban rieng cua game
--   do. Adapter tra cuu (slug, game) truoc roi lui ve ban chung, nen mot game chi phai viet lai
--   nhung trang no muon khac. Dung cot NOT NULL mac dinh '' thay vi NULL vi UNIQUE trong MySQL
--   coi moi NULL la khac nhau — voi NULL thi hai ban ghi cung slug "trang chung" van chen duoc.
--   `body` la VAN BAN THUAN (doan cach nhau bang dong trong, '## ' tieu de phu, '- ' gach dau
--   dong). Khong luu HTML: tang hien thi khong phai loc XSS cua noi dung do nguoi khac go vao.
--
-- admin_login_attempts: bang rieng, khong dung chung `login_attempts` cua nguoi choi. Neu dung
--   chung thi mot nguoi choi go sai mat khau cua chinh minh se lam khoa tai khoan quan tri trung
--   ten (cung scope_key), va nguoc lai — hai he tai khoan tach biet thi bo dem cung phai tach.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS pages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(64)     NOT NULL,
  game_code  VARCHAR(32)     NOT NULL DEFAULT '',
  title      VARCHAR(160)    NOT NULL,
  body       MEDIUMTEXT      NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pages_slug_game (slug, game_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scope      ENUM('username','ip') NOT NULL,
  scope_key  VARCHAR(190)    NOT NULL,
  succeeded  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_attempts_lookup (scope, scope_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
