# Vật phẩm: bảng của server và bảng của client là hai bản game khác nhau

Ghi lại kết quả truy vết ngày 2026-09-06, khởi đầu từ báo lỗi *"túi đồ không mở được, nhân
vật không nâng sao được"*.

## Kết luận ngắn

Game đã bị **thay áo**: bản gốc Trung Quốc lấy bối cảnh thần thoại, bản đang chạy là One
Piece. Bảng vật phẩm của **server** vẫn còn dữ liệu bản gốc, còn **client** mang dữ liệu
bản đang chạy. Người vận hành đã chốt: **theo client mới đúng**.

| | Server | Client |
|---|---|---|
| Nguồn | `server/excel/release/item-table.xlsm`, sheet `基础物品` | `res/97cec-62c2f-5f56f` (= `template/templates.bin`), bảng `基础物品` |
| Số vật phẩm | 1.089 | 1.069 |

Có mặt cả hai bên: **1.066** — trong đó **678 khác tên (63%)**. Khác hẳn sản phẩm, không
phải khác chính tả:

| ID | Server | Client |
|---|---|---|
| 601013 | Võ Đôn Nho | **Bege** |
| 605003 | Bố Đại Hòa Thượng | **Moria** |
| 1000001 | Tiền xu túi (24 Giờ) | **Túi beri (24 Giờ)** |
| 100022 | Lệnh tướng cao cấp | **Chiêu mộ cao cấp** |

Bằng chứng độc lập cho "client đúng": ảnh chụp cửa sổ Phúc lợi của người vận hành hiện
*"Chiêu mộ cao cấp"*.

## Hai vật phẩm server có mà client không có

    501124  "Gói tự chọn Anh hùng hiếm 14 sao"   phát bởi equipment-week-card, hero-week-card
    500198  "Coin Thưởng"                        đồng tiền của shop 150 (cột 资源消耗)

Người chơi `Duyen` đang giữ **75 cái `500198`** — đó là tiền của họ, **không được xoá khỏi
túi**.

Vì client không có mẫu, `getTplInfo(tid)` trả `undefined` và mã gọi đọc thuộc tính trên đó
→ sập. Đã chặn bằng chốt null trong bundle (xem `tools/va-tui-do-crash.py`): vật phẩm không
hiện, nhưng giao diện không sập nữa.

## Vì sao chưa chèn định nghĩa vào templates.bin

Đã mổ được khá sâu:

* Chuỗi lưu kiểu Java `writeUTF`: 2 byte độ dài big-endian + UTF-8. **Kể cả số cũng là chuỗi.**
* Mỗi bảng: `<tên bảng>` → `<số dòng, 4 byte BE>` → `<độ dài khối tên cột, 2 byte BE>` →
  `<khối tên cột>` → các dòng. Đã kiểm: `基础物品` khai 1070 dòng, khối cột 220 byte, đọc ra
  đúng 16 tên cột và 220 byte — khớp tuyệt đối.
* Mỗi dòng có **2 byte đứng đầu**. Đây là chỗ **chưa hiểu**: giá trị gần bằng độ dài dòng
  nhưng lệch ±1…3 tuỳ dòng (chỉ 58/1070 dòng khớp đúng). Bộ đọc "16 ô cố định" cho dữ liệu
  đúng, nhưng bộ đọc theo tiền tố thì trôi khỏi bảng.

Đọc thì đủ, **ghi thì chưa**. Ghi sai 2 byte đó là client không tải được — đổi lấy hai dòng
trong túi là cái giá sai. Cần hiểu nốt ngữ nghĩa 2 byte này (hoặc có bộ đóng gói của nhà
phát hành) rồi mới chèn.

## Cần xin nhà phát hành

`templates.bin` khớp đúng bản build đang chạy. Đó là cách duy nhất để hai vật phẩm trên
hiện được, và cũng xoá luôn 678 chỗ lệch tên giữa hai bảng.

## Đã sửa được gì

`tools/doc-bang-templates.py` đọc bảng `基础物品` của client → `ten_vat_pham()`.
`tools/gen-danh-muc-game.py` dùng nó để đặt tên vật phẩm cho cổng GM: **752 tên đã sửa**,
23 mã client không có thì giữ tên server.

## Một cái bẫy đã làm chẩn đoán sai hai lần

`tools/excel-to-json.py` **bỏ qua `.xlsm`**, mà bảng vật phẩm chính là `item-table.xlsm`
(có trong `excel-name-map.json` là `物品表.xlsm`, và được 1 class trong `tcg-game.jar` tham
chiếu — server thật sự nạp). Vì thế file này vô hình với mọi công cụ, kể cả bảng thuật ngữ
và các bản soát. Lần đầu tôi kết luận "không có bảng vật phẩm trong repo" — sai. Ai rà vật
phẩm sau này nhớ mở cả `.xlsm`.
