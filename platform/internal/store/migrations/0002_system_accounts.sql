-- Tai khoan he thong cua so cai ghi kep.
--
-- Moi giao dich phai co tong dai so bang 0, nen tien vao vi nguoi choi luon phai di
-- ra tu mot tai khoan khac. Hai tai khoan duoi day la doi ung cua nguoi choi:
--
--   nap tien : gateway_clearing (-)  ->  vi nguoi choi (+)
--   quy doi  : vi nguoi choi (-)     ->  game_revenue (+)
--
-- gateway_clearing am dan theo tong so tien da nap; doi soat voi bao cao cua cong
-- thanh toan chinh la so sanh voi con so nay.

INSERT INTO wallet_accounts (kind, user_id, code, currency)
SELECT 'system', NULL, 'gateway_clearing', 'XU'
 WHERE NOT EXISTS (SELECT 1 FROM wallet_accounts WHERE code = 'gateway_clearing' AND currency = 'XU');

INSERT INTO wallet_accounts (kind, user_id, code, currency)
SELECT 'system', NULL, 'game_revenue', 'XU'
 WHERE NOT EXISTS (SELECT 1 FROM wallet_accounts WHERE code = 'game_revenue' AND currency = 'XU');

INSERT INTO wallet_accounts (kind, user_id, code, currency)
SELECT 'system', NULL, 'adjustment', 'XU'
 WHERE NOT EXISTS (SELECT 1 FROM wallet_accounts WHERE code = 'adjustment' AND currency = 'XU');
