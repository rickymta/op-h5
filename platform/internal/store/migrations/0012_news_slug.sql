-- Duong dan chu cho bai viet: news.slug.
--
-- Vi sao: /tin-tuc/123 khong cho nguoi doc lan nao biet bai do noi gi, va cong cu tim kiem
-- cung khong. /tin-tuc/vi-xu-dung-chung thi co. URL cu theo id VAN MO DUOC (API tra cuu
-- "khoa" la slug hoac id), nen khong co lien ket nao gay.
--
-- Vi sao NOT NULL DEFAULT '' chu khong phai NULL: seed bai viet (docker/platform-seed/news.*.sql)
-- dung `INSERT ... ON DUPLICATE KEY UPDATE` tren slug de nap lai duoc nhieu lan ma khong nhan
-- ban. ON DUPLICATE KEY chi nhan ra dung ban khi khoa la UNIQUE tren mot cot KHONG NULL —
-- MySQL coi moi NULL la khac nhau, nen voi cot NULL thi moi lan nap lai se chen them mot bai.
--
-- Cai gia phai tra: nguoc lai, MySQL coi moi chuoi RONG la GIONG nhau. Nen thu tu o day bat
-- buoc: them cot -> dien slug cho moi dong dang co -> moi them rang buoc UNIQUE. Dao thu tu
-- thi cau ALTER thu ba chet ngay tren co so du lieu da co 2 bai tro len.
--
-- Backfill dung 'bai-<id>' chu khong sinh tu tieu de: bo dau tieng Viet trong SQL thuan la mot
-- chuoi ~90 lan REPLACE long nhau, doc khong ra va de sai. Slug THAT do seed (docker/platform-seed/
-- news.*.sql) hoac trang quan tri dat — ca hai deu sinh slug tu tieu de bang internal/textnorm.
-- 'bai-<id>' chi la cho giu cho de rang buoc UNIQUE dung duoc ngay.
--
-- Trigger trg_news_slug_bi: luoi an toan cho MOI cau INSERT khong kem slug — file seed cu
-- (news.haitac.sql viet truoc khi co cot nay), SQL go tay cua nguoi truc, hay khoi phuc tu ban
-- dump cu. Khong co no thi cau INSERT nhieu dong dau tien nhu vay chet ca cau vi "Duplicate
-- entry '' for key 'uq_news_slug'". UUID_SHORT() chu khong phai id vi BEFORE INSERT chua co id.

SET NAMES utf8mb4;

ALTER TABLE news ADD COLUMN slug VARCHAR(96) NOT NULL DEFAULT '' AFTER id;

UPDATE news SET slug = CONCAT('bai-', id) WHERE slug = '';

ALTER TABLE news ADD UNIQUE KEY uq_news_slug (slug);

DROP TRIGGER IF EXISTS trg_news_slug_bi;

CREATE TRIGGER trg_news_slug_bi BEFORE INSERT ON news FOR EACH ROW
  SET NEW.slug = IF(NEW.slug IS NULL OR NEW.slug = '', CONCAT('bai-', UUID_SHORT()), NEW.slug);
