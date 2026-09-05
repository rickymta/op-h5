-- Gop tai khoan cua cong cu GM (gm_users, migration 0006 — do tang PHP dung) vao admin_users,
-- de trang quan tri va cong cu GM chi con MOT lan dang nhap va MOT nhat ky.
--
-- Vi sao khong lam nguoc lai (gop admin_users vao gm_users): admin_sessions va admin_audit da
-- co khoa ngoai tro toi admin_users; doi chieu do la viec khong can thiet. gm_users/gm_audit
-- se chet cung tang PHP o giai doan 5 (docs/plan-go-react.md).
--
-- Bon vai tro, quyen tang dan:
--   viewer   chi xem
--   gm       thao tac GM tren nhan vat (nap tay, gui thu, xoa kho do) — khong sua cau hinh nen tang
--   operator sua cau hinh nen tang (nguong may chu, goi, nap Xu) + moi quyen cua gm
--   owner    tat ca

SET NAMES utf8mb4;

ALTER TABLE admin_users
  MODIFY COLUMN role ENUM('viewer','gm','operator','owner') NOT NULL DEFAULT 'viewer';

-- Chuyen tai khoan GM sang. INSERT IGNORE: trung ten thi giu dong cu cua admin_users —
-- ha quyen mot tai khoan dang dung nguy hiem hon la de lai mot dong thua.
INSERT IGNORE INTO admin_users (username, password_hash, role, status, last_login_at, created_at)
SELECT g.username, g.password_hash,
       CASE g.role WHEN 'owner' THEN 'owner' ELSE 'gm' END,
       CASE g.status WHEN 'active' THEN 'active' ELSE 'disabled' END,
       g.last_login_at, g.created_at
  FROM gm_users g;
