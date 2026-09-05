-- Email cho tai khoan quan tri, va co bao "mat khau con la mat khau mac dinh".
--
-- Vi sao can co: tai khoan dau tien duoc tao voi mat khau mac dinh ghi thang trong ma
-- nguon, ma ma nguon nay o mot repo CONG KHAI. Trang quan tri chi nghe loopback nen rui ro
-- co han, nhung "ai cung biet mat khau" van la mot su that phai hien ra man hinh chu khong
-- phai chon trong log. Co nay bat khi tai khoan duoc gieo bang mat khau mac dinh va tat
-- ngay khi nguoi dung tu doi mat khau.

SET NAMES utf8mb4;

ALTER TABLE admin_users
  ADD COLUMN email VARCHAR(190) NULL AFTER username,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER status;
