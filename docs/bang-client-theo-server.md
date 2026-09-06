# Bảng cấu hình trong `templates.bin` phải khớp máy chủ — cách đồng bộ

## Vì sao
Client và máy chủ là hai bản build khác nhau (xem [ten-may-chu-theo-client.md](ten-may-chu-theo-client.md),
[thang-tinh-lech-bang.md](thang-tinh-lech-bang.md)). Máy chủ gửi id theo bảng **của nó**; client tra
bảng **của nó** để vẽ. Id nào client không có thì `getTplInfo` trả `undefined` và màn đó sập:

- Thăng tinh: phe/chi phí lệch → server từ chối 80026 (đã đồng bộ `英雄基础`).
- VIP SHOP (2026-09-06): `vip商城商品` client 870 dòng, server 2646 → `sortFun` đọc `.sort` của
  `undefined` → *Cannot read properties of undefined (reading 'sort')*, bảng trống.

Kết quả quét đầy đủ: [lech-bang-client-server.md](lech-bang-client-server.md) — 261/668 bảng lệch.
Nguy hiểm nhất là các bảng máy chủ có **nhiều dòng hơn** client (chỉ SV lớn): `兽灵培养` +1200,
`精英召唤活动` +867, `锦鲤活动` +440, `地区` +421, `砸金蛋活动` +84, `通天塔关卡` +20, `充值项` +15…
— mỗi bảng là một màn có thể sập y như VIP SHOP khi máy chủ gửi id mới.

## Nguyên tắc
| Loại bảng | Bên đúng | Công cụ |
|---|---|---|
| Luật (chi phí, mốc, cửa hàng, hoạt động, drop) | **máy chủ** | `templates-bin.py bang` / `tuong` |
| Chữ người chơi thấy (tên, mô tả, thông báo) | **client** | `dong-bo-ten-server.py`, `chuan-hoa-dich.py` |

## Lệnh
```bash
# thay cả bảng theo server (danh sách mặc định: BANG_THEO_SERVER trong tool — vip商城商品, vip等级)
python3 tools/templates-bin.py bang website/game/res/<templates.bin hiện tại> /tmp/templates.moi.bin
# hoặc chỉ định bảng (phải có trong BANG_THEO_SERVER để biết workbook/sheet server)
python3 tools/templates-bin.py bang <goc> <ra> vip商城商品
python3 tools/phat-hanh-res.py template/templates.bin /tmp/templates.moi.bin   # tên băm mới + manifest
scp website/game/res/<hash> haitac-test:/opt/tcg/assets/res/
# commit manifest, push, deploy nginx
```
Mọi file ghi ra đều qua cổng kiểm mô phỏng parser client (680 bảng, hết file sạch).

Lớp chắn thứ hai trong bundle: `tools/va-vip-shop.py` — hai bộ so sánh `sort` của cửa hàng coi
mẫu thiếu là `sort=0` thay vì ném lỗi, để dù bảng có lệch thì phần còn lại vẫn vẽ.

## Muốn quét lại
Đoạn quét nằm trong lịch sử phiên 2026-09-06 (so từng bảng cùng tên client↔server theo cột chung);
nên đưa vào `tools/` khi làm đợt đồng bộ lớn: thêm từng bảng luật vào `BANG_THEO_SERVER`, chạy
`bang`, kiểm từng màn.
