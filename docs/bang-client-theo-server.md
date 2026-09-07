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

## Bẫy byte 10 của `templates.bin` (2026-09-07, treo 40%)
Client giải nén bằng `uncompress2`: **ghi đè byte thứ 10 của file nén thành `0x76` rồi mới
inflate** — một kiểu chống sửa file. File gốc (và hai bản đầu tiên, vì đoạn đầu chưa đổi) tình cờ
có byte 10 = `0x76`; bản VIP-fix và đợt 1 nén lại bằng zlib thường thì byte 10 = `0xf5` → bị ghi
đè → luồng deflate hỏng → zlib.js xin cấp 4,4 GB → treo ở 40% ("Đang phân tích dữ liệu" = 2/5).
Đã đo bằng chính parser client trong trình duyệt (`op-test.html` cục bộ, móc `TemplateManager`
ra `window`). Từ nay `templates-bin.py` tự dựng luồng zlib: khối *stored* đầu chứa bảng giả
`_vop` (client không biết tên thì chỉ `warn` rồi bỏ qua), nên byte 10 luôn = ký tự `v`;
`kiem` báo đỏ nếu byte 10 ≠ 0x76. Đừng nén `templates.bin` bằng zlib thường nữa.

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

## Đợt 1 (2026-09-06, `res/97cec-7c0d7-5f56f`) — 39 bảng luật đã theo server
`vip商城商品`, `vip等级`, `兽灵培养` (+1200 dòng), `精英召唤活动` (+867), `锦鲤活动` (+440),
`砸金蛋活动` (+84), `地区` (+421), `通天塔关卡` (+20), `通天塔通关奖励`, `充值项` (+15), `任务库` (+24),
`商城商品` (+6), `buff`, `英雄技能` (+16), `仙器基础` (+75), `种族竞技基础配置` (+24), `限定英雄商品`
(+15), `限定英雄召唤奖励` (+15), `限定英雄培养商店`, `头像`, `冒险形象`, `三十六重天关卡`,
`任务比拼活动`, `跨服BOSS排行奖励`, `公会BOSS关卡`, `每日签到`, `重置基础`, `月基金奖励`, `神龙强化`,
`装备进阶`, `消耗组`, `兽魂祈祷UP基础`, `先知圣殿召唤分组`, `暑期大促销`, `连线英雄怪物`, `多多益善基础`,
`功能开启`, `原型对应羁绊组`, `宝青坊召唤分组`. Sau đợt này còn 200 bảng lệch, phần lớn chỉ ở cột
trình bày (giữ client là đúng) hoặc dòng chỉ client có. Còn dòng chỉ server có ở: `皮肤穿戴管理`
(+42), `军团入侵基础` (+29), `世界BOSS活动` (+3), `文本库` (+56, chữ), `VIP特权说明条目` (+2, chữ) —
đợt sau thêm vào `BANG_THEO_SERVER` (trừ bảng chữ).

## Quét lại
```bash
python3 tools/quet-bang-lech.py                                   # in bảng lệch, templates.bin manifest đang trỏ
python3 tools/quet-bang-lech.py <templates.bin> --md docs/lech-bang-client-server.md
```
