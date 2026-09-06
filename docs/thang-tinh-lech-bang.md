# Thăng tinh báo "Mời lựa chọn chỉ định tướng nha" (mã 80026)

## Hiện tượng
Màn thăng tinh hiện đủ vật liệu (Kaido 1/1, "Tướng 5 sao" 4/4), bấm **Thăng tinh** thì
toast *Mời lựa chọn chỉ định tướng nha* và không lên sao. Hộp "Thu hoạch đường tắt" là do
bấm vào ô "+" trong bộ chọn vật liệu, không phải lỗi.

## Nguyên nhân
Toast là **thông báo lỗi từ server** (`代码提示语言` id 80026 = `请选择指定的英雄哟`), không
phải client. Server (`tcg-game.jar`, `MixResItem.consumeCheckHero`) kiểm tra từng tướng
người chơi chọn theo **bảng `英雄基础` của server** (`server/excel/release/hero.xlsx`):

- chi phí `15:5:4` (狗粮 kiểu 15) = 4 tướng 5 sao có phe ∈ {4, 5, 6}
  (`GDHero$Camp.heroCanReplaceChaos`);
- chi phí `12:XY:n` = n tướng sao X phe Y; `11:X:n` = n tướng sao X phe bất kỳ.

Client mang một bản `英雄基础` **khác** (trong `templates.bin`): 11 nguyên mẫu
(Law, S.Rozo, Black Beard, Luffy Gear4, Rayleigh, Otohime, Kaido, Shanks, Yamato, Oden,
Nika) bị đổi sang phe 6 "Hỗn độn" trong khi server để phe 1–5; 1566 dòng lệch
`消耗指定英雄`, 964 dòng lệch `消耗狗粮`, 1395 dòng lệch `消耗灌魔之瓶`, 77 dòng lệch
`升星分段`. Người chơi chọn Oden/Rayleigh/Luffy G4 (client: phe 6 → hợp lệ) nhưng server
thấy phe 1/2 → từ chối. Bản res của hệ thống cũ (`res.zip`) cũng lệch y hệt, tức lỗi có từ
trước khi chuyển server.

## Cách xử lý
Server không đổi được (JAR + excel là luật thật), nên client theo server ở các cột luật,
giữ cột trình bày (tên, ảnh, model, tiếng, tranh) của client:

```bash
python3 tools/templates-bin.py tuong website/game/res/<templates.bin hiện tại> /tmp/templates.moi.bin
python3 tools/phat-hanh-res.py template/templates.bin /tmp/templates.moi.bin
scp website/game/res/<hash mới> haitac-test:/opt/tcg/assets/res/
# commit manifest libs/2af72-f100c-2af72.json, push, deploy nginx
```

Lệnh `tuong` đọc `server/excel-src/hero/` (sheet `英雄基础`, `英雄高阶升星`), ghi đè
`COT_LUAT` (phe, sao, nguyên mẫu, sao kế/trước, chi phí, thuộc tính, kỹ năng, ưu tiên ra
trận…), thêm 72 dòng sao cao server có mà client thiếu (302211–302246, 302311–302346), giữ
nguyên 2037 dòng chỉ client có (không còn đường lên tới vì `下一星英雄ID` theo server).
Mọi file ghi ra đều qua cổng kiểm mô phỏng parser client.

**Hệ quả nhìn thấy:** 11 tướng trên đổi biểu tượng phe từ "Hỗn độn" về phe server dùng
(Kaido = Ma, Shanks = Thần, Otohime = Yêu, Rayleigh = Tiên, Law/S.Rozo/Luffy G4/Oden/
Yamato/Nika = Người, Black Beard = Ma) — đây là phe server đã dùng để tính khắc chế, duyên
phận từ trước, nên giao diện giờ mới khớp với trận đấu thật.

Nếu nhận `hero.xlsx` mới từ nhà phát hành: `python tools/excel-to-json.py` rồi chạy lại
`tuong`.
