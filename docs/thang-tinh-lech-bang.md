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

## Cập nhật 2026-09-07 — 11 nguyên mẫu về phe Hỗn độn ở CẢ máy chủ
Sau khi client theo phe máy chủ, người chơi không dùng được 20 bản Nika 6★ làm vật liệu
`15:6:1` (Hỗn độn chỉ nhận phe 4/5/6) vì máy chủ xếp Nika phe Người; ứng viên duy nhất là
Kaido lại đang trong đội hình → kẹt. Người vận hành chốt theo thiết kế One Piece: 11 nguyên
mẫu (Law, S.Rozo, Black Beard, Luffy G4, Rayleigh, Otohime, Kaido, Shanks, Yamato, Oden, Nika)
là **Hỗn độn ở cả hai bên**. `tools/phe-hon-don.py` sửa `阵营=6` cho 470 dòng trong
`excel-src/hero/01.json` → `json-to-excel hero` → ExcelProbe OK → image server; client chạy lại
`templates-bin.py tuong` (cột 阵营 là cột luật) → `res/97cec-ae249-5f56f`. Máy chủ có sẵn lớp
phe 6 (tướng Hỗn độn riêng 6012–6016) nên không phải vá code. Hệ quả: nội dung tính theo phe
(khắc chế, duyên phận phe, đấu trường chủng tộc) coi 11 tướng này là Hỗn độn.

## Cập nhật 2026-09-07 (chiều) — nguyên liệu thăng tinh của 11 nguyên mẫu Hỗn độn
Đổi phe xong, Black Beard vẫn báo "sai nguyên liệu": cột `消耗狗粮` của Black Beard/Law/S.Rozo
vẫn mang khuôn phe thường (`12:65` = tướng 6★ phe Ma, `12:51`/`12:61` = phe Người) nên bản
sao của chính họ (giờ là Hỗn độn) không được nhận. `tools/phe-hon-don.py` nay đổi luôn
`12:<sao><phe>:n` → `15:<sao>:n` (tướng <sao>★ Hỗn độn — máy chủ nhận phe 4/5/6) cho 11 nguyên
mẫu: 98 dòng (1022: 8, 1023: 45, 5017: 45); 8 nguyên mẫu 6001–6008 đã sẵn khuôn `15:`.
Mã `11:<sao>` (phe bất kỳ) và `1:<id>` (đúng tướng) giữ nguyên. Quy trình như trên:
`phe-hon-don.py` → `json-to-excel hero` → probe → `docker cp` vào 6 container Java + `restart game`
→ `templates-bin.py tuong` → `res/97cec-60e97-5f56f`.

Đã rà thêm White Beard, Shanks, Rayleigh, Otohime — **không cần sửa**:

| Tướng | Phe (client = server) | Nguyên liệu tướng | Huy hiệu từ 10★ | Nguồn huy hiệu (excel-src) |
|---|---|---|---|---|
| White Beard 5018 | 5 Ma | `12:55` / `12:65` — 6★ phe Ma, cùng khuôn Mihawk 5008 | 100051 Ngũ hoàng | Đồ Đằng Thánh Điện, Bảo Thanh Phường, mê cung, đập trứng |
| Shanks 6005 | 6 Hỗn độn | `15:5` / `15:6` sẵn từ gốc | 100050 Hải quân | Đồ Đằng Thánh Điện, nhiệm vụ, mê cung, đập trứng |
| Rayleigh 6002 | 6 Hỗn độn | `15:5` / `15:6` sẵn từ gốc | 100048 Hải tặc | Đồ Đằng Thánh Điện, mê cung, đập trứng |
| Otohime 6003 | 6 Hỗn độn | `15:5` / `15:6` sẵn từ gốc | 100049 Kiếm sĩ | Đồ Đằng Thánh Điện, Bảo Thanh Phường, mê cung, đập trứng |

Phe Ma có 12 tướng gốc 5★ nên `12:55:4` của White Beard là khả thi. 46 dòng máy chủ (5★–50★)
của cả bốn khớp client từng cột; `下一星英雄ID` của dòng 50★ là `0` ở cả hai bên nên 50 dòng
51★–100★ chỉ client có là dữ liệu chết (186 dòng chết của 11 nguyên mẫu vẫn mang `12:` — không
tới được, để nguyên). Law 1022 và 34 nguyên mẫu "10 dòng" dừng ở 14★ (`下一星英雄ID=0`) ở cả hai bên.
