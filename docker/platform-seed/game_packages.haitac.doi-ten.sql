-- Doi ten 15 goi tung trung ten nhau trong cua hang web.
--
-- Vi sao phai co file rieng: `game_packages.haitac.sql` chi ghi de cot `name` khi ten dang
-- luu CON CHU HAN (de khong dap len ten nguoi van hanh sua tay). Muoi lam goi duoi day da
-- mang ten tieng Viet — nhung la ten TRUNG NHAU, nen upsert kia khong bao gio cham toi.
--
-- Do tren may chu that 2026-09-06: ba muc goi ngay (19001-19009) chi khac nhau o giai doan
-- ngay mo may chu, va hai bo goi gioi han toan may chu (2701x, 2702x) chi khac nhau o gia —
-- tren bang deu hien thanh nhieu dong y het nhau. Ten moi dua vao dung thu doc duoc tu bang
-- cau hinh: giai doan (功能ID 720) va moc gia (額度). Khong bia noi dung.
--
-- Dieu kien `AND name = <ten cu>`: neu nguoi van hanh da tu doi ten thi giu nguyen ten do.
-- Chay lai vo hai. Tren may moi, seed chinh da co ten dung nen cac lenh nay khong khop gi.
SET NAMES utf8mb4;

UPDATE game_packages SET name='Gói quà ngày mức 1 · ngày 1–14'  WHERE game_code='haitac' AND package_id='19001' AND name='Gói quà hàng ngày';
UPDATE game_packages SET name='Gói quà ngày mức 2 · ngày 1–14'  WHERE game_code='haitac' AND package_id='19002' AND name='Gói quà Quý 1';
UPDATE game_packages SET name='Gói quà ngày mức 3 · ngày 1–14'  WHERE game_code='haitac' AND package_id='19003' AND name='Gói quà Quý 2';
UPDATE game_packages SET name='Gói quà ngày mức 1 · ngày 15–30' WHERE game_code='haitac' AND package_id='19004' AND name='Gói quà hàng ngày';
UPDATE game_packages SET name='Gói quà ngày mức 2 · ngày 15–30' WHERE game_code='haitac' AND package_id='19005' AND name='Gói quà Quý 1';
UPDATE game_packages SET name='Gói quà ngày mức 3 · ngày 15–30' WHERE game_code='haitac' AND package_id='19006' AND name='Gói quà Quý 2';
UPDATE game_packages SET name='Gói quà ngày mức 1 · từ ngày 31' WHERE game_code='haitac' AND package_id='19007' AND name='Gói quà hàng ngày';
UPDATE game_packages SET name='Gói quà ngày mức 2 · từ ngày 31' WHERE game_code='haitac' AND package_id='19008' AND name='Gói quà Quý 1';
UPDATE game_packages SET name='Gói quà ngày mức 3 · từ ngày 31' WHERE game_code='haitac' AND package_id='19009' AND name='Gói quà Quý 2';

UPDATE game_packages SET name='Gói giới hạn toàn máy chủ 1 · mốc 15.000' WHERE game_code='haitac' AND package_id='27011' AND name='toàn bộ server hạn mua 1';
UPDATE game_packages SET name='Gói giới hạn toàn máy chủ 2 · mốc 40.000' WHERE game_code='haitac' AND package_id='27012' AND name='toàn bộ server hạn mua 2';
UPDATE game_packages SET name='Gói giới hạn toàn máy chủ 3 · mốc 50.000' WHERE game_code='haitac' AND package_id='27013' AND name='toàn bộ server hạn mua 3';
UPDATE game_packages SET name='Gói giới hạn toàn máy chủ 1 · mốc 3.000'  WHERE game_code='haitac' AND package_id='27021' AND name='toàn bộ server hạn mua 1';
UPDATE game_packages SET name='Gói giới hạn toàn máy chủ 2 · mốc 15.000' WHERE game_code='haitac' AND package_id='27022' AND name='toàn bộ server hạn mua 2';
UPDATE game_packages SET name='Gói giới hạn toàn máy chủ 3 · mốc 40.000' WHERE game_code='haitac' AND package_id='27023' AND name='toàn bộ server hạn mua 3';
