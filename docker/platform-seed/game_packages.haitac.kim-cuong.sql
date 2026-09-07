-- Doi thuat ngu "Nguyen bao" -> "Kim cuong" cho GOI DA CO trong DB (2026-09-07).
--
-- Vi sao phai co file rieng: game_packages.haitac.sql chi ghi de `name` khi ten con chu Han,
-- nen ten Viet dang luu ("10.000 Nguyên Bảo") khong bao gio duoc sua boi upsert. Game hai tac
-- goi tien nap la Kim cuong (client: vat pham 200004), "Nguyen bao" la am Han-Viet cua ban goc.
-- REPLACE tren ca ba dang hoa/thuong; chay lai bao nhieu lan cung vo hai.
UPDATE game_packages
   SET name        = REPLACE(REPLACE(REPLACE(name,        'Nguyên Bảo', 'Kim Cương'), 'Nguyên bảo', 'Kim cương'), 'nguyên bảo', 'kim cương'),
       description = REPLACE(REPLACE(REPLACE(description, 'Nguyên Bảo', 'Kim Cương'), 'Nguyên bảo', 'Kim cương'), 'nguyên bảo', 'kim cương')
 WHERE game_code = 'haitac'
   AND (name LIKE '%Nguyên Bảo%' OR name LIKE '%Nguyên bảo%' OR name LIKE '%nguyên bảo%'
        OR description LIKE '%Nguyên Bảo%' OR description LIKE '%Nguyên bảo%' OR description LIKE '%nguyên bảo%');
