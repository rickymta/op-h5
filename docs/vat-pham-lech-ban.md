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

## Đã chèn được — sau khi đọc đúng parser của client (2026-09-06, tối)

Bản đầu tôi mổ file bằng suy luận và dừng ở "2 byte đầu dòng không hiểu". Cách đúng là giải
mã bảng chuỗi obfuscate của bundle (chỉ số = mã + `0x8c`) rồi đọc thẳng `parseData`:

    name = readUTFString(); count = readInt32();
    rows = count × readArrayBuffer(readInt16());     // int16 = độ dài phần ĐI SAU nó

`count` gồm cả dòng tiêu đề; lớp bảng lấy ô theo **chỉ số cột** từ dòng 0. Công cụ mới
`tools/templates-bin.py` đọc/ghi theo khung này và có cổng kiểm **mô phỏng Laya.Byte** —
file gốc qua, file hỏng cũ rớt đúng chỗ, bản chèn qua. Hai tool cũ (`chuan-hoa-templates.py`,
`chen-vat-pham-client.py`) sinh file hỏng và đã bị xoá.

Hai vật phẩm đã có trong client: `501124` "Gói tự chọn Tướng hiếm 14 sao", `500198` "Coin Thưởng".

## Bài học đắt nhất: `/res/` cache `immutable 30d`

Ghi đè tài nguyên **tại chỗ** là vô hình với người chơi đã tải nó một lần. Suốt nhiều đợt,
người vận hành vẫn chạy bản gốc (vẫn thấy "5 Tinh anh hùng", "VNĐ") trong khi tôi tưởng bản
sửa đang chạy; tới khi một lần tải mới kéo về bản hỏng thì game treo 5-6%. Deploy đúng:
`tools/phat-hanh-res.py <tên logic> <file>` → tên băm mới + manifest trỏ sang; manifest và
loader nay `no-cache` và được bust bằng `opManifestV` (play.php → a3b31 → loader).

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
