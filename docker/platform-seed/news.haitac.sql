-- Tin mau cho bang `news` (migration 0010): 2 tin chung cua nen tang + 4 tin cua game haitac.
--
-- CHI CHEN KHI BANG CON TRONG. Bien @seed_news duoc tinh TRUOC cau INSERT, nen chay lai file
-- nay khong nhan ban tin, va cung khong ghi de tin ma nguoi van hanh da soan o trang quan tri.
--
-- Noi dung deu la su that ve he thong nay, khong co su kien co thuong, khong co moc thoi gian
-- hay so lieu nao duoc bia ra. `body` la van ban thuan: doan cach nhau bang dong trong, "## "
-- mo mot tieu de phu, "- " mo mot gach dau dong. published_at = NOW() vi day dung la luc chung
-- duoc dang tren ban trien khai nay.

SET NAMES utf8mb4;

SET @seed_news := (SELECT COUNT(*) FROM news);

INSERT INTO news (game_code, kind, title, summary, body, pinned, status, published_at)
SELECT game_code, kind, title, summary, body, pinned, status, NOW() FROM (

  SELECT NULL AS game_code, 'news' AS kind,
    'Ví Xu dùng chung cho mọi game' AS title,
    'Một tài khoản, một ví. Số dư Xu thuộc về tài khoản chứ không thuộc riêng game nào, nên nạp một lần là dùng được ở mọi game trong cổng.' AS summary,
    'Tài khoản ở cổng này dùng được cho mọi game đang phát hành, và số dư Xu gắn với tài khoản chứ không gắn với riêng một game.

## Điều đó nghĩa là gì
- Nạp một lần, tiêu Xu ở bất kỳ game nào trong cổng.
- Lịch sử giao dịch nằm chung một chỗ: Tài khoản → Lịch sử.
- Chỉ có một mật khẩu là mật khẩu tài khoản cổng. Vào game không phải đăng nhập lần thứ hai.

## Những điều cần biết
- Xu chỉ dùng để mua trong cổng, không quy đổi ngược thành tiền.
- Mỗi lần mua đều trừ Xu và ghi lại thành một đơn. Nếu game từ chối phát hàng, Xu được hoàn lại tự động.
- Không đưa mật khẩu hay mã xác thực cho bất kỳ ai, kể cả người tự xưng là nhân viên hỗ trợ.' AS body,
    0 AS pinned, 'published' AS status

  UNION ALL SELECT NULL, 'news',
    'Hướng dẫn quy đổi Xu sang vật phẩm',
    'Các bước mua một gói bằng Xu: vào cửa hàng của game, chọn gói, chọn nhân vật nhận, xác nhận. Đơn tự cập nhật trạng thái cho tới khi hàng về.',
    'Cửa hàng nằm ở trang của từng game. Bạn cần đăng nhập tài khoản cổng trước khi mua.

## Các bước
- Mở trang của game rồi vào mục Cửa hàng.
- Chọn gói muốn mua. Trang chi tiết ghi rõ nội dung gói, giá Xu và điều kiện (nếu có).
- Chọn nhân vật hoặc máy chủ sẽ nhận hàng.
- Bấm Xác nhận mua. Xu bị trừ ngay và một đơn được tạo.

## Sau khi mua
- Đơn hiện Đang phát trong lúc hệ thống gửi lệnh sang game, rồi chuyển thành Đã phát hoặc Đã gửi thư.
- Gói tính như một lần nạp thì phần thưởng vào thẳng nhân vật. Gói vật phẩm thì vào hòm thư trong game.
- Nếu game từ chối (hết lượt trong ngày, chưa tới điều kiện mở gói), đơn chuyển thành Đã hoàn Xu và số dư trở lại như cũ.

Xem lại toàn bộ đơn đã mua ở Tài khoản → Tổng quan.',
    0, 'published'

  UNION ALL SELECT 'haitac', 'news',
    'Cửa hàng web đã mở',
    'Mua gói bằng Xu ngay trên trang web, không cần vào game. Có các mốc đổi Nguyên Bảo, thẻ tuần, quỹ, đặc quyền, gói ngày, gói giới hạn và gói vật phẩm.',
    'Trang Cửa hàng cho phép mua bằng Xu trong ví tài khoản, ngay trên trình duyệt.

## Đang bán những gì
- Nguyên Bảo: các mốc đổi thẳng. Tỉ lệ 1 Xu = 1 Nguyên Bảo.
- Thẻ tuần, Quỹ, Đặc quyền: kích hoạt trong game, nhận thưởng theo ngày hoặc theo mốc.
- Gói ngày, Gói giới hạn, Gói sự kiện: có điều kiện riêng, trang gói ghi rõ từng điều kiện.
- Vật phẩm: gửi qua thư trong game.

## Về các mốc Nguyên Bảo
Game xử lý mốc Nguyên Bảo y như một lần nạp: lần đầu mua mỗi mốc được cộng gấp đôi, và mỗi lần mua đều cộng điểm VIP. Từ lần thứ hai trở đi của cùng một mốc thì chỉ nhận đúng số ghi trên gói.

## Lưu ý
- Phải đăng nhập mới mua được. Khách chưa đăng nhập vẫn xem được bảng giá.
- Gói có điều kiện mà chưa đủ điều kiện thì game sẽ từ chối, và Xu được hoàn lại ngay.',
    0, 'published'

  UNION ALL SELECT 'haitac', 'news',
    'Nhận quà qua hòm thư trong game',
    'Gói thuộc nhóm Vật phẩm được gửi tới nhân vật bằng thư trong game. Mở hòm thư của đúng nhân vật đã chọn lúc mua để nhận.',
    'Có hai đường đưa hàng vào tài khoản của bạn, và trang gói luôn ghi rõ gói đó đi đường nào.

## Gói tính như một lần nạp
Phần thưởng vào thẳng nhân vật ở máy chủ bạn chọn, không qua hòm thư. Các mốc Nguyên Bảo, thẻ tuần, quỹ, đặc quyền và gói ngày đều đi đường này.

## Gói gửi qua thư
Nhóm Vật phẩm được gửi bằng thư trong game. Vì thư phải có người nhận cụ thể, bạn bắt buộc chọn nhân vật lúc mua.

- Vào game, mở hòm thư, nhận quà đính kèm.
- Chọn đúng nhân vật lúc mua: thư đã gửi thì không chuyển sang nhân vật khác được.
- Hòm thư trong game có hạn thời gian lưu thư, nên nhận sớm.

Nếu đơn báo Đã gửi thư mà hòm thư chưa thấy, thử thoát và vào lại game để tải lại hòm thư.',
    0, 'published'

  UNION ALL SELECT 'haitac', 'notice',
    'Ba dải trạng thái máy chủ nghĩa là gì',
    'Mượt, Đông và Đầy là ba mức tải thật của từng máy chủ, đọc từ số người đang chơi. Chúng quyết định máy chủ nào còn nhận người mới.',
    'Danh sách máy chủ hiện số người đang chơi kèm một trong ba dải. Số này là số thật, lấy từ chính bộ đếm mà cổng vào game đang dùng, không phải con số trang trí.

## Ba dải
- Mượt: máy chủ còn dưới ngưỡng mềm. Nhận cả người mới lẫn người cũ.
- Đông: đã qua ngưỡng mềm. Người đã có nhân vật ở đó vẫn vào bình thường; người mới được hướng sang máy chủ khác cho khỏi chen.
- Đầy: đã qua cả biên tràn. Tạm thời không nhận thêm phiên mới, kể cả người cũ, cho tới khi bớt người.

## Vì sao có lúc bị chuyển sang máy chủ khác
Nút Chơi ngay chọn giúp bạn một máy chủ đang Mượt nếu bạn chưa có nhân vật nào. Nếu bạn đã có nhân vật, hệ thống luôn đưa bạn về đúng máy chủ của nhân vật đó, kể cả khi máy chủ đó đang Đông.

Máy chủ đang bảo trì hoặc đã đóng thì không hiện trong danh sách chọn.',
    0, 'published'

  UNION ALL SELECT 'haitac', 'news',
    'Câu hỏi thường gặp khi vào game',
    'Chơi thẳng trên trình duyệt, không cần tải. Đã đăng nhập cổng thì không phải đăng nhập lần thứ hai. Vài câu hỏi hay gặp ở lần đầu vào game.',
    'Đại Hải Trình chạy thẳng trên trình duyệt, máy tính hay điện thoại đều được, không phải tải ứng dụng.

## Vào game thế nào
Đăng nhập tài khoản cổng rồi bấm Chơi ngay. Bạn không phải đăng nhập lần thứ hai trong game: cổng đã đăng nhập hộ.

## Lần đầu vào thì chọn máy chủ nào
Hệ thống gợi ý sẵn một máy chủ đang Mượt. Bạn vẫn chọn máy chủ khác được ở trang Máy chủ. Chơi cùng bạn bè thì nhớ chọn cùng một máy chủ, vì nhân vật thuộc về máy chủ đã tạo.

## Đã có nhân vật rồi thì sao
Bấm Chơi ngay là vào thẳng máy chủ có nhân vật của bạn, không cần chọn lại.

## Quên mật khẩu
Dùng Quên mật khẩu ở trang đăng nhập của cổng. Cách này cần email khôi phục đã khai trong Tài khoản → Bảo mật, nên hãy khai email trước khi cần đến nó.

## Vào game bị màn hình trắng hoặc đứng ở màn hình tải
Thử tải lại trang. Lần đầu vào phải tải khá nhiều tài nguyên nên chậm hơn các lần sau.',
    0, 'published'

) AS seed
WHERE @seed_news = 0;
