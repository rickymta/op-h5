# Rà chữ phía client (2026-09-10): nhãn đè nhau, thẻ màu cắt chữ, tên tướng/kỹ năng còn lệch

## Ba lỗi trong ảnh của người vận hành

| Màn | Thấy gì | Vì sao | Sửa ở đâu |
|---|---|---|---|
| Thuyền (view `Artifact`) | "Đẳng cấp pháp bảo:12Cấ**Kỹ năng đẳng cấp:5Cấp**" | Bundle ghép `'Đẳng cấp pháp bảo:' + level + 'Cấp'` (189 px @24) vào nhãn ở x=95, nhãn kế ở x=286 | `tools/va-nhan-ghep.py`: ba chuỗi (mỗi chuỗi dùng đúng 1 chỗ) → "Thuyền: 12 Cấp", "Kỹ năng: 5 Cấp", "Tinh luyện: 80 Cấp"; chuỗi `'Cấp'` dùng chung 23 chỗ nên chèn dấu cách ở chỗ ghép thay vì đổi nó |
| Guild kỹ năng (`GuildSkill`) | "Trí tuệ29Trọng thi**(28/40)**" | Bundle ghép `tên + level + 'Trọng thiên'` (重天 dịch máy) vào `labLevelName` rộng 128 px căn trái; `labLevelMax` "(28/40)" đặt cứng ở x=353 | Bundle: `tên + ' tầng ' + level` = "Trí tuệ tầng 29" (cả PVP). `tools/va-ui-nhan.py`: `labLevelName` x=201 rộng 160 căn **phải** kết thúc ở 361, `labLevelMax` từ 365 căn trái, cả hai 22 px — hai hoa văn chiếm 103–201 và 477–575 nên khoảng trống là 201..477 |
| Bí cảnh ải 6 | "Sử dụngSừngĐạt được thắng lợi" | Mô tả gốc `Sử dụng <2214 Sừng hươu trận > Đạt được thắng lợi`. Bộ phân tích thẻ `<mã-màu chữ>` của client (`str2HtmlUnitNoSize`, và `lan2HtmlUnit` cho 文本库) làm `split(' ')` rồi lấy `[1]` → chỉ còn từ đầu. Laya `HTMLParse` lại cắt khoảng trắng đầu/cuối mọi text node nên chữ hai bên dính vào thẻ. "Sừng hươu trận" (鹿角阵) không phải tên tướng mà là **trận hình số 2** của bản gốc — client gọi trận hình theo màu (Đỏ/Tím/Cam/Vàng/Lục/Lam) | Bundle: nối lại toàn bộ phần sau mã màu, đổi dấu cách ở mép đoạn chữ thường thành `&nbsp;` (HTMLParse đổi thành char255 trước khi cắt rồi trả lại dấu cách). Dữ liệu: **sinh lại** 113 mô tả thử thách của 命格关卡挑战 + 融合神殿挑战要求 từ cột luật, tên trận hình/phe/nghề theo client: "Thắng bằng trận hình <2214 Tím>", "Ra trận ít nhất <2214 2> tướng <2214 Ngũ Hoàng>", "Không ra trận tướng <2214 Magic>", "Phải ra trận <2214 Jinbe>" |

Lỗi thẻ màu không riêng Bí cảnh: 284 ô trong 11 bảng client có thẻ nhiều từ (thư 59, gợi ý tướng cho
sưu tập 47, mô tả kỹ năng 25, tips thú hồn 24, đặc quyền VIP 24…) — tất cả hiện đúng sau khi vá bundle,
không phải sửa dữ liệu. Thêm 60 ô viết dính mã (`<22188%>`, `<24671>`) đã tách thành `<2218 8%>`.

Kiểm chứng: hai hàm sau vá được cắt ra chạy trong Node với bảng màu giả — "Sử dụng <2214 Sừng hươu trận >
Đạt được…" → `Sử dụng&nbsp;<span …>Sừng hươu trận</span>&nbsp;Đạt được…`; `<br/>`, `<link …>`, thẻ lỗi
`<22142>` giữ nguyên hành vi cũ.

## Rà tên tướng / tên kỹ năng ở client

Nguồn duy nhất của tên tướng và tên/mô tả kỹ năng là `文本库` trong `templates.bin` (5018 dòng, không
còn ô chữ Hán nào). 133 nguyên mẫu tướng đều có tên; kỹ năng của tướng One Piece đã mang tên One Piece
("Pistol Shot", "Gomu gomu", "Rumble Ball", "Cú Đấm Mochi"…). Điểm lệch tìm được:

| Chỗ | Trước | Sau | Ghi chú |
|---|---|---|---|
| Nhiệm vụ 628001–628008 | "Thăng cấp Kiếm Ma đến N sao" | "Thăng Shanks lên N sao" | tên theo tướng trong cột 事件参数 (600502 = Shanks) |
| Gói 501124 (14★ tự chọn) | "Chu Bá Thông, Trương Tam Phong, Kiếm Ma, Ma Kiều Phong, Đông Phương Bất Bại, Hoàng Sam Nữ Tử" | "Luffy Gear4, Rayleigh, Otohime, Kaido, Shanks, Kuziki Oden" | cùng YID 101060001…07; máy chủ giữ trong item-table.xlsm (không qua excel-src) nên chỉ sửa client |
| Ảnh đại diện / hình phiêu lưu #3 | "Chu Điên" | "Bartolomeo" | icon 1006 và điều kiện mở 100600 đều là Bartolomeo |
| 藏品推荐.适用英雄 (12 ô, 49 tên) | "Nhân tộc: Na Tra; Tiên Tộc: Huyền Trang; …" (tên thần thoại của bản gốc, phe của bản gốc) | "Tân Binh: S.Sanji; Hải Tặc: Perospero; Dũng Sĩ: Gan Fall; Ngũ Hoàng: Mihawk, Jinbe, Marco" | tra `*原始文本` của 文本库 máy chủ (哪吒 → 102000) rồi lấy tên + phe hiện tại; bảng tra 49 tên nằm trong tool |
| Biệt danh PVP Guild (全局变量 9231–9234) | "vô úy", "học thức", "bảo lũy", "tế thế" | viết hoa chữ đầu | |
| Kỹ năng của vài đơn vị phụ | Y Sư: 3 kỹ năng đều tên "Y Sư"; Long Cát Công Chủ: 3 kỹ năng "Tiểu Long Nữ" (tên Kim Dung); Ace: đòn thường tên "Ace" | **chưa đổi** | đơn vị NPC/phụ, cần người vận hành đặt tên |
| "Phổ Công" (普攻) làm tên đòn thường của mọi tướng | | **chưa đổi** | đổi sang "Đánh thường" là một dòng trong GLOSSARY của `chuan-hoa-dich.py` nếu muốn |

Không còn tên Kim Dung (bảng 文本库 trước đồng bộ, 3348 giá trị) ở bảng client nào khác; `神龙技能控制.标题`
"Ứng Long Phá Giáp" khớp với 文本库 7150001 nên giữ.

## Ô còn chữ Hán mà người chơi thấy — đã dịch

buff.触发飘字 (chữ nổi khi buff kích hoạt, 63 ô: 无敌→Vô địch, 反击→Phản kích, 追击→Truy kích…), tên/mô
tả buff Vũ Thần (真气护体, 武神止戈 — 4 dòng), tên gói cửa hàng 7 ngày (14, lấy tên vật phẩm đầu của
phần thưởng), "chi tiết thưởng" của 七日历练 và 挂机掉落商店 (55, sinh từ id vật phẩm), mô tả 22 gói cửa hàng
tuần hoàn ("Kim cương*300, …, Beri*2M"), hạng đấu kế thừa (22), vị trí mỏ (90), tên bộ thú hồn (2), mô tả
kỹ năng thần khí 192, tên 34 hoạt động cũ (đã hết hạn 2020–2022), "Bắc 碚 Khu" → "Bắc Bội khu", lời tựa
4 thần khí độc quyền (405 ô, viết lại theo One Piece vì bản gốc kể về nhân vật 影/炎/光/御). Bundle: "当前战绩：N胜M负"
→ "Thành tích: N thắng M thua", gợi ý tầng + 3 hộp thoại đóng giữ ở Tam thập lục trọng thiên.

Còn lại, cố ý không đụng: 元宵题库 (250 câu đối Tết Nguyên Tiêu — sự kiện đố chữ Hán, dịch vô nghĩa),
tiểu sử 4 tướng có tên gốc Nhật/Hán trong ngoặc (đúng), các cột ghi chú của người thiết kế
(`*…`, 备注, 说明, 对照, 皮肤技能特效替换).

## Cách làm lại (nhận templates.bin / bundle / Excel mới)

```bash
python3 tools/va-nhan-ghep.py --apply                              # bundle (28 chỗ; chạy lại không vá hai lần)
python3 tools/va-ui-nhan.py --ui website/game/res/<ui.bin> --ra build/ui.moi.bin
python3 tools/phat-hanh-res.py ui/ui.bin build/ui.moi.bin
python3 tools/ra-soat-chu-client.py --client website/game/res/<templates.bin> --apply-server   # sua-client.json + excel-src
python3 tools/templates-bin.py sua website/game/res/<templates.bin> build/templates.moi.bin build/ra-soat/sua-client.json
python3 tools/templates-bin.py kiem build/templates.moi.bin
python3 tools/phat-hanh-res.py template/templates.bin build/templates.moi.bin
python3 tools/json-to-excel.py <25 workbook tool in ra> --out server/excel/release
```

`ra-soat-chu-client.py` là **hàm của dữ liệu**: mô tả thử thách sinh từ cột luật, tên tướng tra theo id,
chi tiết thưởng sinh từ id vật phẩm — chỉ vài chục chuỗi dịch cố định nằm trong tool. Ô nào máy chủ có
cùng bảng/id/cột thì ghi cả hai bên (28 file JSON, 25 workbook); bảng client thiếu ở máy chủ (基础物品)
chỉ ghi client.

## Phát hành đợt này

Bản đã xuất: `ui/ui.bin → res/aace3-46ed5-baa8e`, `template/templates.bin → res/97cec-f37c6-5f56f`
(manifest đã trỏ), bundle `libs/e228b-0b904-ac44c.js` (play.php bust cache theo mtime), 25 workbook
trong `server/excel/release`. Máy này không có khoá SSH tới `haitac` (chỉ có `pgaming` của server cũ)
nên chưa lên máy chủ:

```bash
# PC
python tools/mask-secrets.py --check && git add -A && git commit && git push
scp website/game/res/aace3-46ed5-baa8e website/game/res/97cec-f37c6-5f56f root@<haitac>:/opt/tcg/assets/res/
# server (đã bật domain nên phải kèm docker-compose.domain.yml)
cd /opt/tcg/src && git pull && cd docker && docker compose -f docker-compose.image.yml -f docker-compose.domain.yml up -d --build nginx php
# Excel máy chủ chỉ để đồng bộ chữ (client tự vẽ từ bảng của nó) — cập nhật cùng lần build image Java kế tiếp là đủ
```

Lùi lại: manifest trỏ về `res/aace3-4b419-baa8e` / `res/97cec-60e97-5f56f` (hai file cũ vẫn nằm trên
máy chủ), bundle từ `libs/e228b-0b904-ac44c.js.truoc-va-nhan-ghep`.
