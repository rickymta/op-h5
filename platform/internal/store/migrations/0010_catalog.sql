-- "Bo mat" cua cong phat hanh nhieu game (docs/plan-go-react.md muc 15, hop dong giai doan 3 muc 4.1).
--
-- games  + tagline, the loai, mo ta, ba anh (bia doc 3:4 cho the game / key visual ngang cho hero /
--          logo), mau nhan, nhan Moi-Hot-Sap ra, co noi bat (chi MOT game: admin bat o game nay thi
--          tat o game khac trong cung giao dich), ba lien ket cong dong.
-- news     tin tuc / su kien / thong bao. game_code NULL = tin chung cua nen tang. Trang cong khai
--          chi doc status='published' VA published_at <= NOW() (published_at o tuong lai = hen gio).
--
-- URL anh co the TUONG DOI so voi games.site_url (vd /assets/images/logo.png): `id` ghep thanh
-- tuyet doi khi tra /api/games, adapter tra nguyen vi cung host. Anh thuong hieu moi dat o
-- ASSETS_DIR/brand/<game>/..., nginx phuc vu /brand/ (docker/nginx/game_site.conf).

SET NAMES utf8mb4;

ALTER TABLE games
  ADD COLUMN tagline     VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN genre       VARCHAR(48)  NOT NULL DEFAULT '',
  ADD COLUMN description TEXT NULL,
  ADD COLUMN cover_url   VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN banner_url  VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN logo_url    VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN accent      VARCHAR(7)   NOT NULL DEFAULT '',
  ADD COLUMN badge       ENUM('','new','hot','soon') NOT NULL DEFAULT '',
  ADD COLUMN featured    TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN fanpage_url VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN group_url   VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN support_url VARCHAR(255) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS news (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_code    VARCHAR(32) NULL,
  kind         ENUM('news','event','notice') NOT NULL DEFAULT 'news',
  title        VARCHAR(160) NOT NULL,
  summary      VARCHAR(300) NOT NULL DEFAULT '',
  body         TEXT NULL,
  image_url    VARCHAR(255) NOT NULL DEFAULT '',
  link_url     VARCHAR(255) NOT NULL DEFAULT '',
  pinned       TINYINT(1) NOT NULL DEFAULT 0,
  status       ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_by   BIGINT UNSIGNED NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_news_pub (status, published_at),
  KEY idx_news_game (game_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
