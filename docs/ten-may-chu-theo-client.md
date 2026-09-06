# Tên tướng/vật phẩm trên máy chủ lệch với client — đã đồng bộ theo client

## Hiện tượng
Cổng GM → *Nhân vật đang chọn* liệt kê kho đồ với tên "Quách Tĩnh", "Trương Vô Kỵ",
"Đan tiến giai", "Chứng nhận cuồng võ lâm"… trong khi người chơi nhìn thấy Mihawk, Kaido,
"Đá tăng sao", "Vật phẩm thừa". Cột *Tên* ở đó là do console (`/role/bag/query` → game)
trả về, tức là **tên máy chủ đang dùng** — cũng là tên xuất hiện trong thông báo hệ thống,
thư thưởng, "X đã bị khoá"…

## Nguyên nhân
Hai bộ bảng tên thuộc hai bản game khác nhau:

| Bảng | Client (`templates.bin`) | Máy chủ (`server/excel/release`) | Lệch |
|---|---|---|---|
| `文本库.目标文本` (tên tướng qua YID, mô tả) | One Piece | kiếm hiệp Kim Dung | 3637/5017 |
| `基础物品.名称` (item-table.xlsm) | | | 636/1069 |
| `碎片.名称` | | | 113/140 |
| `装备表.名称` | | | 92/93 |
| `符文基础.名称` (bí kíp) | "Haki cấp 1" | "Tửu Túy Quyền" | 22/22 |
| `命格基础.名称` (hồn ngọc) | | "Thiếu Lâm" | 70/70 |
| `仙器基础` / `仙器碎片.名称` (thần khí) | | "Bách Phát Bách Trúng" | 2410 / 256 |
| `藏品基础.藏品名称` (sưu tập) | | "Ngọc Nữ Tâm Kinh" | 143/143 |
| `职业仙器基础.名称` (thần khí nghề) | "Tank" | "Ngoại Công" | 200/200 |
| `神装.名称` (thần trang) | "Fire · Taurus" | "Thanh Long · Kiếm" | 1440/1440 |
| `神龙基础.神龙名称` (thần long) | "Hải Quái-Phá" | "Mai Siêu Phong" | 560/560 |

Đã quyết: **client là đúng** (e41d043). Máy chủ phải theo.

## Cách làm — `tools/dong-bo-ten-server.py`
Đọc `templates.bin` mà manifest đang trỏ tới, ghi đè **chỉ cột tên/目标文本** của các bảng
trên trong `server/excel-src/**` (nguồn sự thật) và trực tiếp trong XML của
`item-table.xlsm` (không nằm trong excel-src, không qua openpyxl để khỏi mất cache công
thức; ô tên có công thức được thay bằng hằng số). Chỉ id có ở cả hai bên; header và cột chữ
Hán không đụng.

```bash
python3 tools/dong-bo-ten-server.py --check
python3 tools/dong-bo-ten-server.py
python3 tools/json-to-excel.py text-localization equipment-table rune destiny immortal-artifact collection class-immortal-artifact divine-equipment divine-dragon --out server/excel/release
# kiểm bằng parser thật (JDK 8 trong Docker, không cần Java trên máy):
docker run --rm -v "$PWD:/w" -w /w eclipse-temurin:8-jdk-jammy sh -c 'javac -proc:none -encoding UTF-8 -cp "server/game/tcg-game.jar:server/game/lib/*" -d build/probe tools/ExcelProbe.java && java -cp "server/game/tcg-game.jar:server/game/lib/*:build/probe" ExcelProbe server/excel/release/text-localization.xlsx com.ososx.tcg.game.config.i18n.LangExcel'
python3 tools/gen-danh-muc-game.py     # danh mục cổng GM (đọc xlsx đã đồng bộ)
```

Danh mục cổng GM phủ mọi loại mà thư phát được (`GDObj$Type` trong `tcg-game.jar`): ví (16 loại
tiền, tên theo client qua `toItemId`), tướng, trang bị, vật phẩm, mảnh, bí kíp, hồn ngọc, thần
khí, mảnh thần khí, sưu tập, thần khí nghề (14), thần trang (16), thần long (20) — 8801 mục.

```bash
```

Excel nằm **trong image** `op-h5-server`, nên bản chính thức đi theo commit → CI → deploy
lại các service Java. Muốn có hiệu lực ngay: `docker cp` 7 workbook vào
`/h5/server/excel/release/` của container `game` rồi **restart container game**.

## ĐỪNG dùng `/srv/game/cmd/excel/reload` trên cụm này
Lần thử 2026-09-06: reload làm JVM game hết heap (`Terminating due to
java.lang.OutOfMemoryError: Java heap space` — heap đã cắt để vừa 8 GB, reload nạp bộ Excel
thứ hai song song bộ cũ), `ExitOnOutOfMemoryError` tắt tiến trình, Docker khởi động lại →
người chơi rớt mạng ~2 phút, và trong lúc nạp dở thì thăng tinh trả NPE
(`HeroAction.starUp:178`). Restart container game sạch hơn: cũng ~2 phút nhưng không có
khoảng "nửa cũ nửa mới".
