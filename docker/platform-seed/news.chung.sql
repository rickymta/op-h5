-- 25 bai tin CHUNG cua nen tang cho bang `news` (game_code = '').
--
-- Khac voi news.haitac.sql (chi chen khi bang con trong), file nay dung upsert theo `slug`:
-- chay lai khong nhan ban, va sua noi dung o day roi nap lai thi ban moi de len ban cu.
-- Dieu do doi cot `slug VARCHAR(96) NOT NULL DEFAULT ''` + UNIQUE tren bang `news`.
--
-- Noi dung: chi viet dieu DUNG voi he thong nay. Khong su kien, khong moc thoi gian, khong so
-- lieu bia, khong hua qua tang, khong hua tong dai 24/7 hay hoan tien — vi khong cai nao trong
-- so do ton tai. Moi cau ve vi, don hang, may chu, tai khoan game deu tra duoc trong
-- platform/README.md, docs/design-cua-hang.md muc 1 va ma nguon platform/internal/.
--
-- `body` la VAN BAN THUAN: doan cach nhau bang dong trong, '## ' mo tieu de phu, '- ' mo gach
-- dau dong. Khong HTML — tang hien thi khong phai loc XSS.
--
-- Thuat ngu thong nhat: Xu (tien chung cua nen tang), Nguyen Bao (tien trong game), may chu,
-- hom thu trong game.
--
-- Dung MOT bai pinned=1 (bai gioi thieu nen tang). Bai do la kind='news' chu khong phai
-- 'notice': thanh thong bao mong tren dau trang chi lay tin 'notice' + pinned, va mot bai gioi
-- thieu nam thuong truc o do thi vo nghia.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Nhom 1 — Gioi thieu nen tang
-- ---------------------------------------------------------------------------

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('gioi-thieu-nen-tang', '', 'news',
'Cổng game này hoạt động thế nào: một tài khoản, một ví, nhiều game',
'Đăng ký một lần, chơi mọi game trên cổng, tiêu chung một ví Xu. Bài này nói rõ cái gì dùng chung, cái gì riêng theo từng game, và bạn tự làm được những việc nào.',
'Cổng này phát hành game H5 — game chạy thẳng trong trình duyệt, không có bản cài, không qua kho ứng dụng. Điểm khác biệt so với cách phát hành thông thường nằm ở chỗ mọi game dùng chung một tài khoản và một ví.

## Ba thứ tạo nên cổng
- Tài khoản cổng: đăng ký một lần bằng tên đăng nhập và mật khẩu. Mỗi lần bạn mở một game mới, tài khoản trong game đó được tạo tự động từ tài khoản cổng, bạn không phải nhớ thêm mật khẩu nào.
- Ví Xu: Xu là đơn vị quy ước của cổng, gắn với tài khoản chứ không gắn với từng game. Nạp một lần rồi tiêu ở game nào tuỳ bạn.
- Cửa hàng của từng game: nơi đổi Xu lấy vật phẩm, gói Nguyên Bảo, thẻ, quỹ hay đặc quyền của game đó.

## Cái gì chung, cái gì riêng
Dùng chung cho mọi game: tài khoản, mật khẩu, ví Xu và toàn bộ lịch sử giao dịch.

Riêng theo từng game: nhân vật, tiến độ, kho đồ và tiền trong game. Hai game không dùng chung nhân vật, và Nguyên Bảo của game này không chuyển sang game khác được.

## Bạn tự làm được những gì
Trong mục Tài khoản bạn xem số dư, lịch sử nạp và quy đổi, danh sách nhân vật theo từng game, các phiên đăng nhập đang mở, đổi mật khẩu và gắn email khôi phục. Không phải nhắn ai để làm những việc đó.

## Số liệu trên trang là số thật
Số người đang chơi và trạng thái từng máy chủ hiển thị trên trang được đọc từ chính bộ đếm mà cổng vào game đang dùng để quyết định có cho vào hay không. Không có con số nào được dựng lên cho đẹp.

## Xu không quy đổi ngược
Xu dùng để mua trong cổng, không đổi lại thành tiền mặt. Mỗi lần mua đều trừ Xu và tạo một đơn. Nếu máy chủ game từ chối đơn, Xu được hoàn lại ví và bạn thấy một dòng Hoàn trong lịch sử.',
'', '', 1, 'published', '2026-08-20 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

-- ---------------------------------------------------------------------------
-- Nhom 2 — Huong dan tai khoan, vi va don hang
-- ---------------------------------------------------------------------------

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('tao-tai-khoan', '', 'news',
'Tạo tài khoản: quy tắc tên đăng nhập và ba việc nên làm ngay',
'Tên đăng nhập dài 6 đến 15 ký tự, chỉ gồm chữ thường, số và dấu gạch dưới. Mật khẩu ít nhất 8 ký tự. Bài này nói luôn ba việc nên làm ngay sau khi đăng ký xong.',
'Đăng ký chỉ cần hai ô: tên đăng nhập và mật khẩu. Email khôi phục là tuỳ chọn, nhưng đọc hết bài rồi bạn sẽ thấy vì sao nên điền ngay.

## Quy tắc tên đăng nhập
- Dài từ 6 đến 15 ký tự.
- Chỉ dùng chữ cái thường a đến z, chữ số và dấu gạch dưới. Không dấu tiếng Việt, không khoảng trắng, không ký tự đặc biệt.
- Chữ hoa bạn gõ vào sẽ được chuyển thành chữ thường. Nghĩa là NamAnh và namanh là cùng một tài khoản, bạn không thể tạo hai tài khoản chỉ khác nhau ở chữ hoa.
- Tên đăng nhập không đổi được sau khi tạo, nên chọn một cái bạn còn muốn dùng sau vài tháng.

## Quy tắc mật khẩu
Ít nhất 8 ký tự. Hệ thống không giữ mật khẩu gốc của bạn: nó chỉ lưu một chuỗi băm, và từ chuỗi đó không lần ngược ra mật khẩu được. Hệ quả thực tế là quên mật khẩu thì không ai đọc hộ bạn được, chỉ có thể đặt lại.

## Ba việc nên làm ngay sau khi đăng ký
- Vào Tài khoản, mục Bảo mật, điền email khôi phục. Đây là đường duy nhất bạn tự lấy lại được tài khoản khi quên mật khẩu.
- Kiểm tra lại mật khẩu không trùng với mật khẩu bạn đang dùng ở nơi khác. Dùng lại mật khẩu là cách mất tài khoản phổ biến nhất.
- Ghi nhớ tên đăng nhập chính xác. Khi cần hỗ trợ, đây là thông tin đầu tiên bạn phải cung cấp.

## Nếu tên đăng nhập báo đã có người dùng
Nghĩa là ai đó đã đăng ký tên đó trước. Chọn tên khác, đừng thêm dấu chấm hay khoảng trắng để lách — những ký tự đó không hợp lệ.

## Gõ sai mật khẩu nhiều lần
Hệ thống tạm khoá việc đăng nhập một lúc sau nhiều lần sai liên tiếp. Đó là lớp chặn người khác dò mật khẩu của bạn. Chờ ít phút rồi thử lại, hoặc dùng chức năng Quên mật khẩu.',
'', '', 0, 'published', '2026-08-20 15:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('dang-nhap-mot-lan-choi-moi-game', '', 'news',
'Một tài khoản dùng cho mọi game: cách nó thật sự hoạt động',
'Bấm Chơi ngay ở game nào thì tài khoản trong game đó được tạo tự động. Bạn không đăng nhập lần thứ hai, và mật khẩu của bạn không bao giờ được gửi sang cụm máy chủ game.',
'Bạn chỉ đăng nhập một lần, ở cổng. Từ đó trở đi, mở game nào cũng vào thẳng.

## Chuyện gì xảy ra khi bạn bấm Chơi ngay
Lần đầu bạn mở một game, cổng tạo cho bạn một tài khoản riêng bên trong game đó rồi đăng nhập hộ bạn. Lần sau vào lại, cổng nhận ra bạn và dùng đúng tài khoản game cũ, nên nhân vật và tiến độ vẫn nguyên.

Bạn không thấy tài khoản game đó, cũng không cần nhớ nó. Chỉ có một mật khẩu duy nhất trong toàn bộ hệ thống, là mật khẩu tài khoản cổng.

## Mật khẩu của bạn không đi sang game
Mỗi cặp tài khoản và game có một khoá riêng do cổng giữ, và cổng dùng khoá đó để nói chuyện với máy chủ game. Mật khẩu thật của bạn không rời khỏi cổng.

Điều này có hai hệ quả nên biết: đổi mật khẩu ở cổng không làm hỏng nhân vật trong game, và ngược lại, kể cả khi một game gặp sự cố thì mật khẩu tài khoản cổng của bạn cũng không nằm ở đó.

## Mỗi game một tài khoản game riêng
Cùng một người dùng, nhưng ở mỗi game là một tài khoản game khác nhau với khoá khác nhau. Nhờ vậy tiến độ hai game hoàn toàn tách biệt, và sự cố ở game này không kéo theo game kia.

## Cái duy nhất đi xuyên qua mọi game
Ví Xu. Số dư nằm ở tài khoản cổng, nên nạp ở đâu cũng như nhau và tiêu ở game nào cũng được.

## Xem mình đã vào những game nào
Vào Tài khoản, mục Nhân vật. Ở đó liệt kê từng game bạn đã mở, tài khoản game tương ứng và máy chủ, kèm nút vào thẳng game đó.',
'', '', 0, 'published', '2026-08-21 10:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('vi-xu-hoat-dong-the-nao', '', 'news',
'Ví Xu hoạt động thế nào và vì sao số dư không thể lệch',
'Số dư không phải một con số bị cộng trừ, mà là tổng của các dòng trong sổ. Bài này giải thích cách ghi sổ, vì sao một lần nạp không bao giờ được cộng hai lần, và bốn ô thống kê ở trang Ví nghĩa là gì.',
'Ví Xu được ghi theo kiểu sổ kế toán chứ không phải một ô số bị cộng trừ. Hiểu điều này giúp bạn tự kiểm tra ví của mình mà không cần hỏi ai.

## Số dư là tổng của sổ
Mỗi lần Xu vào hoặc ra đều sinh ra một dòng trong sổ, kèm thời điểm, loại giao dịch và số tiền. Số dư hiển thị chính là tổng của mọi dòng đó, tính lại mỗi lần bạn mở trang.

Vì thế số dư không bao giờ lệch với lịch sử. Nếu bạn cộng tay các dòng trong mục Lịch sử, kết quả phải bằng số dư đang hiện. Lệch nhau là dấu hiệu có chuyện, và đó là việc đáng báo cho hỗ trợ.

## Một giao dịch không tự sinh ra tiền
Mỗi giao dịch được ghi sao cho phần cộng và phần trừ triệt tiêu nhau. Không có đường nào để Xu xuất hiện mà không có một dòng giải thích nó tới từ đâu.

## Nạp lại lần hai không cộng hai lần
Mọi cổng thanh toán đều gửi lại thông báo khi chưa nhận được xác nhận. Mỗi giao dịch nạp mang một mã chống trùng gắn với mã giao dịch của bên thanh toán, nên thông báo gửi lại lần thứ hai, thứ ba đều rơi vào cùng một mã và chỉ cộng đúng một lần.

## Bốn ô thống kê ở trang Ví
- Tổng đã nạp: toàn bộ Xu từng vào ví, từ trước tới nay.
- Đã quy đổi: toàn bộ Xu đã dùng để mua gói.
- Đơn thành công: số đơn máy chủ game đã phát hàng, trên tổng số đơn bạn từng tạo.
- Đang chờ: số đơn đang đợi máy chủ game phát hàng.

Bốn con số này đọc thẳng từ sổ cái và bảng đơn, nên chúng không phải bản sao cập nhật chậm của cái gì cả.

## Xu là một chiều
Xu vào ví thì tiêu được trong cổng, nhưng không quy đổi ngược thành tiền mặt. Hãy nạp đúng bằng số bạn định tiêu.',
'', '', 0, 'published', '2026-08-21 16:30:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('nap-xu-vao-vi', '', 'notice',
'Nạp Xu vào ví: đường đi hiện tại',
'Nút Nạp Xu ở trang Ví đang tắt vì cổng nạp mới chưa mở. Tạm thời nạp qua trang nạp của game, Xu vẫn về đúng ví tài khoản của bạn và hiện một dòng Nạp trong lịch sử.',
'Trang Ví của tài khoản có một nút Nạp Xu, và hiện nút đó đang tắt kèm dòng giải thích. Bài này nói rõ vì sao và nạp bằng đường nào.

## Vì sao nút đang tắt
Cổng nạp đang được chuyển sang hệ thống mới. Chừng nào đường mới chưa chạy thật, nút vẫn tắt: một nút bấm vào không đi đâu còn tệ hơn là không có nút.

## Nạp bằng đường nào
Từ trang Ví, theo liên kết sang trang game. Trang nạp hiện có nằm ở đó. Nạp xong, Xu về đúng ví tài khoản cổng của bạn, không phải một ví riêng của game.

## Kiểm tra sau khi nạp
- Mở Tài khoản, mục Lịch sử, lọc theo loại Nạp. Mỗi lần nạp thành công là một dòng, có thời điểm và số Xu.
- Số dư trên thanh trên cùng phải tăng đúng bằng số Xu ở dòng đó.
- Chưa thấy dòng nào thì đợi thêm một chút rồi tải lại trang. Bên thanh toán xác nhận xong thì Xu mới vào.

## Nếu tiền đã trừ mà Xu chưa vào
Giữ lại mã giao dịch mà bên thanh toán trả cho bạn, kèm thời điểm và số tiền. Đó là thứ tra cứu được. Đừng nạp lại lần nữa để thử — nếu giao dịch cũ vẫn đang xử lý, bạn sẽ trả tiền hai lần.

## Chỉ nạp qua đường chính thức
Chỉ nạp trên tên miền chính thức của cổng và của game. Không nạp qua ai đó nhận nạp hộ, không mua Xu của người lạ. Những giao dịch đó nằm ngoài hệ thống nên không có gì tra cứu và không có gì bảo vệ bạn.',
'', '', 0, 'published', '2026-08-22 09:30:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('truoc-khi-bam-mua', '', 'news',
'Bốn thứ nên kiểm trước khi bấm xác nhận mua',
'Nhận ở đâu, gói đi đường nào, điều kiện của gói và giá Xu. Kiểm bốn dòng này mất mười giây và tránh được gần hết các rắc rối thường gặp sau khi mua.',
'Trang xác nhận mua có một bảng tóm tắt. Đọc bốn dòng dưới đây trước khi bấm là đủ để không phải hối tiếc.

## 1. Nhận ở đâu
Dòng quan trọng nhất. Quà được phát về đúng nhân vật và máy chủ bạn chọn, và sau khi đã phát thì không chuyển sang nhân vật khác được.

Nếu bạn chơi nhiều nhân vật, đây là chỗ dễ nhầm nhất. Đọc lại tên máy chủ và tên nhân vật, không chỉ nhìn lướt.

## 2. Gói này đi đường nào
Có hai đường, và trang gói ghi rõ gói của bạn đi đường nào:
- Cộng thẳng vào nhân vật. Game xử lý y như một lần nạp trong game, nên các quy tắc nạp của game đều áp dụng.
- Gửi qua hòm thư trong game. Bạn phải vào game, mở hòm thư của đúng nhân vật đó rồi bấm nhận.

Biết trước điều này giúp bạn không đi tìm nhầm chỗ khi vào game.

## 3. Điều kiện của gói
Nhiều gói có điều kiện do game đặt ra, ghi ngay trên trang chi tiết:
- Giới hạn số lượt mua mỗi ngày.
- Yêu cầu cấp VIP tối thiểu.
- Chỉ mở trong một khoảng ngày kể từ khi máy chủ mở.

Chưa thoả điều kiện thì máy chủ game từ chối đơn. Bạn không mất Xu, nhưng cũng không có hàng, nên kiểm trước vẫn hơn.

## 4. Giá Xu và số dư còn lại
Bảng tóm tắt có hai dòng Số dư hiện tại và Số dư sau. Nếu con số ở dòng Số dư sau không như bạn nghĩ, dừng lại và xem lại gói.

## Một điều nữa về gói Nguyên Bảo
Các mốc đổi Nguyên Bảo được game tính như một lần nạp: lần đầu mua mỗi mốc được cộng gấp đôi, và mỗi lần mua đều cộng điểm VIP. Từ lần thứ hai của cùng một mốc trở đi thì chỉ nhận đúng số ghi trên gói. Nếu bạn định mua nhiều, mua lần đầu ở nhiều mốc khác nhau sẽ khác với mua nhiều lần cùng một mốc.',
'', '', 0, 'published', '2026-08-22 17:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('doc-lich-su-giao-dich', '', 'news',
'Đọc lịch sử giao dịch: bốn loại dòng và ý nghĩa của chúng',
'Nạp, Quy đổi, Hoàn, Điều chỉnh. Bài này giải thích từng loại, cách lọc, và thông tin nào trong lịch sử là thứ bộ phận hỗ trợ cần khi bạn báo sự cố.',
'Mục Lịch sử trong Tài khoản ghi lại mọi lần Xu vào và ra khỏi ví. Đây là nơi tự trả lời phần lớn câu hỏi về tiền.

## Bốn loại dòng
- Nạp: Xu vào ví sau khi bên thanh toán xác nhận.
- Quy đổi: Xu ra khỏi ví khi bạn mua một gói trong cửa hàng của game.
- Hoàn: Xu quay lại ví khi máy chủ game từ chối đơn của bạn.
- Điều chỉnh: thay đổi do bộ phận vận hành thực hiện, ví dụ đền bù sau sự cố. Mỗi lần điều chỉnh đều bắt buộc ghi lý do và vào nhật ký.

## Lọc và xem thêm
Ô Loại giao dịch cho phép xem riêng từng loại. Danh sách hiển thị theo trang, bấm Xem thêm để nối tiếp.

Không có ô tìm theo nội dung, vì bộ lọc chạy ở máy chủ chỉ nhận loại giao dịch. Một ô tìm chỉ lọc được mấy trang đã tải là một ô tìm nói dối, nên nó không được dựng.

## Đối chiếu nhanh
Tổng đại số của mọi dòng bằng đúng số dư đang hiện: cộng các dòng Nạp và Hoàn, trừ các dòng Quy đổi. Trang Ví có sẵn hai ô Tổng đã nạp và Đã quy đổi để bạn đối chiếu nhanh mà không phải cộng tay.

## Khi báo sự cố, lấy gì từ đây
- Thời điểm chính xác của dòng giao dịch, cả ngày lẫn giờ.
- Loại giao dịch và số Xu.
- Với đơn mua: tên game, tên máy chủ và tên nhân vật nhận hàng.

Có ba thứ đó thì việc tra cứu nhanh hơn nhiều, vì mọi giao dịch đều được ghi theo tài khoản và thời điểm. Tuyệt đối không gửi kèm mật khẩu — không ai cần đến nó để tra một giao dịch.

## Một dòng lịch sử không mất đi
Lịch sử không xoá được, kể cả bởi bạn. Đó là chủ ý: một sổ giao dịch mà xoá được thì không còn dùng để đối chiếu.',
'', '', 0, 'published', '2026-08-23 10:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('khi-nao-xu-duoc-hoan', '', 'news',
'Khi nào Xu được hoàn tự động, và khi nào không',
'Máy chủ game từ chối đơn thì Xu quay lại ví, bạn không phải yêu cầu. Nhưng khi hàng đã phát thì không hoàn. Bài này nói rõ bốn trạng thái đơn và ranh giới giữa hai trường hợp.',
'Câu trả lời ngắn: Xu được hoàn khi máy chủ game từ chối phát hàng, và không được hoàn khi hàng đã phát. Phần dưới nói rõ hơn.

## Bốn trạng thái của một đơn
- Đang xử lý: Xu đã trừ, lệnh phát hàng đã gửi sang máy chủ game, đang đợi trả lời.
- Đã phát: máy chủ game đã phát hàng cho nhân vật bạn chọn. Đây là trạng thái cuối, không hoàn.
- Đã hoàn Xu: máy chủ game từ chối, và Xu đã quay lại ví. Bạn thấy một dòng Hoàn trong lịch sử.
- Thất bại: cổng đã thử lại nhiều lần mà máy chủ game vẫn không nhận. Bình thường Xu được hoàn ngay sau đó và đơn chuyển tiếp sang Đã hoàn Xu. Nếu đơn dừng hẳn ở Thất bại, hãy báo hỗ trợ kèm thời điểm và tên nhân vật.

## Vì sao máy chủ game từ chối
Gần như luôn là do điều kiện của gói:
- Đã hết số lượt mua trong ngày của gói đó.
- Cấp VIP của nhân vật chưa đủ theo yêu cầu của gói.
- Gói chỉ mở trong một khoảng ngày kể từ khi máy chủ mở, và hôm nay đã ngoài khoảng đó.

Trong mọi trường hợp trên, việc hoàn Xu là tự động. Bạn không phải mở phiếu yêu cầu, không phải nhắn ai.

## Khi nào không hoàn
- Hàng đã phát đúng gói, đúng nhân vật bạn chọn. Chọn nhầm nhân vật hay nhầm gói không phải lý do hoàn, vì hệ thống đã làm đúng thứ bạn xác nhận.
- Quà đã vào hòm thư trong game. Thư đã gửi thì không thu về được.

Đó là lý do bảng tóm tắt trước khi mua có riêng một dòng Nhận ở, và dòng đó đáng đọc trước khi bấm.

## Xu vào ví rồi thì ở lại ví
Việc hoàn đưa Xu trở lại ví của bạn, không trả về tài khoản ngân hàng hay thẻ. Xu là một chiều: vào ví thì tiêu trong cổng, không quy đổi ngược thành tiền mặt.

## Chờ bao lâu là hợp lý
Việc từ chối và hoàn diễn ra ngay khi máy chủ game trả lời. Nếu một đơn nằm ở Đang xử lý lâu bất thường, hãy tải lại trang trước; vẫn vậy thì báo hỗ trợ kèm thời điểm tạo đơn.',
'', '', 0, 'published', '2026-08-23 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('doi-mat-khau', '', 'news',
'Đổi mật khẩu và chuyện xảy ra ngay sau đó',
'Đổi mật khẩu ở mục Bảo mật cần mật khẩu hiện tại và mật khẩu mới ít nhất 8 ký tự. Ngay khi đổi xong, mọi phiên đăng nhập khác bị đăng xuất, còn phiên bạn đang dùng thì giữ nguyên.',
'Đổi mật khẩu nằm ở Tài khoản, mục Bảo mật. Việc này mất chưa tới một phút và nên làm ngay khi bạn nghi mật khẩu bị lộ.

## Cần những gì
- Mật khẩu hiện tại. Không nhớ mật khẩu hiện tại thì dùng chức năng Quên mật khẩu ở trang đăng nhập.
- Mật khẩu mới, ít nhất 8 ký tự.
- Gõ lại mật khẩu mới để xác nhận.

## Điều xảy ra ngay sau khi đổi
Mọi phiên đăng nhập khác của tài khoản bị đăng xuất, trên mọi thiết bị. Phiên bạn đang dùng để đổi thì giữ nguyên, nên bạn không bị văng ra giữa chừng.

Đây chính là lý do đổi mật khẩu là việc đầu tiên nên làm khi nghi có người khác vào tài khoản: nó vừa khoá cửa vừa đuổi hết người đang ở trong.

## Nhân vật trong game không bị ảnh hưởng
Mật khẩu bạn đổi là mật khẩu tài khoản cổng. Nhân vật, tiến độ và kho đồ trong từng game không liên quan, và bạn không phải làm gì thêm ở phía game.

Nếu bạn đang mở game trên một tab khác, tab đó có thể vẫn chạy tới khi phiên game hết hạn. Tải lại trang là cách chắc chắn nhất để mọi thứ trở về trạng thái mới.

## Nên đổi khi nào
- Ngay khi nghi mật khẩu bị lộ, hoặc thấy một phiên lạ trong danh sách phiên đang mở.
- Sau khi đăng nhập ở máy của người khác hay máy công cộng.
- Khi mật khẩu đang dùng trùng với mật khẩu ở một dịch vụ khác.

## Không cần đổi định kỳ chỉ vì đã lâu
Đổi mật khẩu theo lịch mà không có lý do thường khiến người ta chọn mật khẩu dễ đoán hơn và ghi lại ở chỗ không an toàn. Một mật khẩu dài, duy nhất cho cổng này, giữ lâu vẫn tốt hơn một chuỗi ngắn đổi hằng tháng.',
'', '', 0, 'published', '2026-08-24 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('quen-mat-khau', '', 'news',
'Quên mật khẩu: việc phải chuẩn bị trước khi cần đến',
'Chức năng Quên mật khẩu gửi liên kết đặt lại tới email khôi phục. Tài khoản chưa gắn email thì không tự lấy lại được — nên hãy gắn email ngay hôm nay, không phải hôm mất.',
'Chức năng Quên mật khẩu nằm ở trang đăng nhập. Nó chỉ hoạt động khi tài khoản của bạn đã có email khôi phục, và đó là lý do bài này tồn tại.

## Cách nó chạy
Bạn nhập email khôi phục đã gắn với tài khoản. Hệ thống gửi tới email đó một liên kết đặt lại mật khẩu, hiệu lực trong thời gian ngắn. Mở liên kết, đặt mật khẩu mới, xong.

Liên kết đặt lại chính là chìa khoá tài khoản trong khoảng thời gian nó còn hiệu lực. Không chuyển tiếp email đó cho ai, không đọc mã trong đó cho ai qua điện thoại hay tin nhắn.

## Việc phải làm trước
Vào Tài khoản, mục Bảo mật, điền email khôi phục. Chọn một email bạn còn vào được và bản thân email đó cũng được bảo vệ tử tế — mất email nghĩa là mất luôn đường lấy lại tài khoản game.

## Nếu tài khoản chưa có email khôi phục
Bạn không tự đặt lại được, phải liên hệ bộ phận hỗ trợ. Việc này chậm hơn nhiều và cần bạn chứng minh tài khoản là của mình, thường bằng lịch sử giao dịch và thông tin nhân vật. Không có gì bảo đảm chứng minh được.

## Nếu không nhận được email
- Kiểm tra hộp thư rác và mục quảng cáo.
- Kiểm tra bạn nhập đúng email đã gắn với tài khoản, chứ không phải một email khác của bạn.
- Chức năng này cần hệ thống gửi thư được cấu hình. Nếu chưa bật, trang Quên mật khẩu sẽ nói thẳng điều đó thay vì để bạn chờ vô ích.

## Đặt lại xong thì làm gì
Đăng nhập lại bằng mật khẩu mới, rồi mở mục Bảo mật xem danh sách phiên đang mở. Thấy phiên nào lạ thì bấm đăng xuất mọi nơi khác.',
'', '', 0, 'published', '2026-08-24 15:30:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('phien-dang-mo', '', 'news',
'Xem phiên đang mở và đăng xuất mọi nơi khác',
'Mục Bảo mật liệt kê mọi thiết bị đang đăng nhập vào tài khoản của bạn, kèm địa chỉ mạng và thời điểm. Một nút để đăng xuất tất cả những nơi khác, giữ lại phiên bạn đang dùng.',
'Mỗi lần bạn đăng nhập, hệ thống tạo một phiên. Vào Tài khoản, mục Bảo mật, bạn thấy toàn bộ phiên đang còn hiệu lực.

## Mỗi dòng cho biết gì
- Đuôi mã phiên, để phân biệt các phiên với nhau mà không lộ mã đầy đủ.
- Địa chỉ mạng của lần đăng nhập đó.
- Mô tả trình duyệt và thiết bị.
- Thời điểm đăng nhập và thời điểm phiên hết hạn.
- Nhãn đánh dấu phiên bạn đang dùng để xem trang này.

## Đọc danh sách thế nào cho đúng
Nhiều dòng không có nghĩa là bị xâm nhập. Mỗi trình duyệt, mỗi thiết bị, mỗi lần bạn xoá cookie rồi đăng nhập lại đều sinh một phiên mới. Máy tính ở nhà, điện thoại và máy tính ở chỗ làm là ba dòng bình thường.

Đáng nghi là khi bạn thấy một thiết bị hoặc một địa chỉ mạng mà bạn chắc chắn không dùng, nhất là vào thời điểm bạn đang ngủ hoặc không hề mở trang.

## Đăng xuất mọi nơi khác
Nút này kết thúc tất cả phiên trừ phiên hiện tại. Dùng nó khi:
- Bạn quên đăng xuất ở máy của người khác hoặc máy công cộng.
- Bạn thấy một phiên lạ trong danh sách.
- Bạn vừa lấy lại tài khoản sau khi nghi bị chiếm.

Đăng xuất mọi nơi khác không đổi mật khẩu. Nếu người kia biết mật khẩu của bạn thì họ đăng nhập lại được ngay. Vì thế thứ tự đúng là đổi mật khẩu trước, đăng xuất sau — mà đổi mật khẩu vốn đã tự đăng xuất mọi phiên khác rồi.

## Phiên tự hết hạn
Phiên có thời hạn, ghi ngay trên từng dòng. Hết hạn thì bạn phải đăng nhập lại. Đó là lớp bảo vệ khi bạn quên đăng xuất ở đâu đó và cũng quên mất là mình đã quên.',
'', '', 0, 'published', '2026-08-25 10:30:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

-- ---------------------------------------------------------------------------
-- Nhom 3 — An toan tai khoan
-- ---------------------------------------------------------------------------

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('nhan-biet-trang-gia-mao', '', 'news',
'Nhận biết trang giả mạo trước khi gõ mật khẩu',
'Trang lừa đảo sao chép giao diện rất giống, nhưng tên miền thì không sao chép được. Nhìn thanh địa chỉ trước khi gõ mật khẩu, và đừng bao giờ đăng nhập từ liên kết người khác gửi.',
'Cách mất tài khoản phổ biến nhất không phải bị dò mật khẩu, mà là tự tay gõ mật khẩu vào một trang trông giống trang thật.

## Thứ duy nhất đáng tin: thanh địa chỉ
Giao diện sao chép được, logo sao chép được, thậm chí cả tốc độ tải cũng bắt chước được. Tên miền thì không. Trước khi gõ mật khẩu, nhìn lên thanh địa chỉ và đọc từ phải sang trái phần tên miền.

Vài mẹo thường gặp của trang giả:
- Thêm chữ vào tên miền thật, kiểu đuôi lạ hoặc gạch nối ở giữa.
- Đổi một ký tự trông giống nhau, ví dụ số 0 thay chữ o, hoặc chữ l thay chữ i.
- Đặt tên miền thật thành đường dẫn phía sau một tên miền lạ. Phần quan trọng là phần trước dấu gạch chéo đầu tiên.

## Không đăng nhập từ liên kết người khác gửi
Kể cả từ bạn bè, kể cả trong nhóm chat của game. Cách an toàn là tự gõ tên miền của cổng vào thanh địa chỉ, hoặc mở từ dấu trang bạn tự lưu.

Sau khi đăng nhập một lần thành công, hãy lưu trang vào dấu trang và dùng nó từ đó về sau.

## Dấu hiệu khác của trang giả
- Hỏi cả mật khẩu lẫn mã trong email khôi phục cùng lúc. Trang thật không bao giờ hỏi mã đặt lại mật khẩu ở đâu ngoài chính trang đặt lại.
- Hứa tặng vật phẩm, tặng Xu, tặng nạp gấp đôi nếu bạn đăng nhập vào đó. Cổng này không có chương trình như vậy.
- Yêu cầu chuyển tiền vào tài khoản cá nhân để được cộng Xu.
- Giục bạn làm nhanh vì sắp hết hạn.

## Nếu lỡ gõ mật khẩu vào một trang lạ
Mở ngay trang thật, đổi mật khẩu. Việc đổi mật khẩu tự đăng xuất mọi phiên khác. Sau đó kiểm tra lịch sử giao dịch và email khôi phục trong mục Bảo mật xem có bị thay đổi không.',
'', '', 0, 'published', '2026-08-26 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('khong-dua-mat-khau-va-ma-xac-thuc', '', 'news',
'Không đưa mật khẩu hay mã trong email cho bất kỳ ai',
'Mật khẩu và liên kết đặt lại mật khẩu là hai chìa khoá của tài khoản. Ai xin chúng, dù xưng danh gì, đều đang cố lấy tài khoản của bạn — không có ngoại lệ nào cả.',
'Có đúng hai thứ mở được tài khoản của bạn: mật khẩu, và liên kết đặt lại mật khẩu gửi tới email khôi phục. Giữ được hai thứ đó thì không ai vào được.

## Vì sao không ai cần hỏi
Bộ phận vận hành làm việc trên tài khoản của bạn bằng tên đăng nhập và mã giao dịch, không cần mật khẩu. Mọi thao tác hỗ trợ như tra đơn, nạp bù, gửi vật phẩm đều thực hiện từ phía hệ thống.

Nói cách khác, một yêu cầu đưa mật khẩu không phải là thủ tục bất tiện — nó là dấu hiệu của lừa đảo, ngay từ câu hỏi đầu tiên.

## Liên kết đặt lại mật khẩu còn nguy hiểm hơn
Kẻ xấu chỉ cần biết email khôi phục của bạn để bấm Quên mật khẩu. Việc còn thiếu là liên kết trong hộp thư của bạn. Vì thế trò lừa hay gặp là gọi điện hoặc nhắn tin nói rằng cần đọc mã trong email để xác minh, để hoàn tiền, để nhận quà.

Không đọc, không chuyển tiếp, không chụp màn hình email đó cho ai. Nếu bạn không tự bấm Quên mật khẩu mà vẫn nhận được email đặt lại, nghĩa là có người đang thử chiếm tài khoản: bỏ qua email đó và đổi mật khẩu ngay.

## Những kiểu xin thường gặp
- Xin mật khẩu để hỗ trợ nạp hộ hoặc sửa lỗi nhân vật.
- Xin đăng nhập hộ để nhận quà sự kiện.
- Nhắn riêng tự xưng nhân viên, hứa đền bù, rồi xin thông tin đăng nhập.
- Rủ mua bán tài khoản, mua Xu giá rẻ ngoài hệ thống.

## Nếu đã lỡ đưa
Đổi mật khẩu ngay. Việc đó tự đăng xuất mọi phiên khác. Sau đó vào mục Bảo mật kiểm tra email khôi phục còn đúng của bạn không, và xem lại lịch sử giao dịch. Nếu email khôi phục đã bị đổi, hãy báo hỗ trợ ngay kèm tên đăng nhập và các giao dịch gần nhất bạn nhớ được.',
'', '', 0, 'published', '2026-08-26 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('dat-mat-khau-manh', '', 'news',
'Đặt mật khẩu mạnh mà vẫn nhớ được',
'Độ dài quan trọng hơn ký tự lạ, và điều quan trọng nhất là không dùng lại mật khẩu ở nơi khác. Ba cách đặt mật khẩu vừa khó đoán vừa dễ nhớ.',
'Yêu cầu tối thiểu của hệ thống là 8 ký tự. Đó là mức sàn, không phải mức nên dùng. Bài này nói cách chọn một mật khẩu thật sự khó đoán mà bạn vẫn nhớ.

## Nguyên tắc thứ nhất: đừng dùng lại
Quan trọng hơn mọi mẹo khác. Nếu mật khẩu ở đây trùng với mật khẩu email, mạng xã hội hay một diễn đàn nào đó, thì tài khoản của bạn chỉ an toàn ngang nơi yếu nhất trong số đó. Rất nhiều vụ mất tài khoản game bắt đầu từ một website hoàn toàn không liên quan bị lộ dữ liệu.

Riêng mật khẩu email khôi phục thì càng phải khác, vì email là đường lấy lại tài khoản.

## Nguyên tắc thứ hai: dài quan trọng hơn rắc rối
Một cụm bốn từ ghép lại khó đoán hơn nhiều so với một từ ngắn cộng vài ký tự đặc biệt. Thay ký tự kiểu viết a thành @ là mẹo cũ, công cụ dò mật khẩu nào cũng biết.

## Ba cách đặt
- Ghép bốn từ không liên quan thành một cụm dài, viết liền hoặc nối bằng dấu gạch dưới.
- Lấy một câu bạn nhớ rõ rồi rút chữ đầu mỗi từ, thêm vài con số không phải năm sinh.
- Dùng trình quản lý mật khẩu để nó sinh chuỗi ngẫu nhiên và nhớ hộ. Đây là cách tốt nhất nếu bạn chịu cài một lần.

## Tránh những thứ này
- Tên đăng nhập, tên nhân vật, tên game, ngày sinh, số điện thoại.
- Chuỗi bàn phím liền nhau và các mật khẩu phổ biến.
- Mật khẩu bạn từng gõ vào một trang lạ, dù chỉ một lần.

## Cất ở đâu
Trình quản lý mật khẩu là tốt nhất. Ghi ra giấy cất kín ở nhà cũng chấp nhận được. Đừng lưu trong tin nhắn tự gửi cho mình, trong ghi chú không khoá, hay trong một file tên là matkhau.

## Sau khi đổi
Đổi mật khẩu ở mục Bảo mật sẽ đăng xuất mọi phiên khác. Nếu bạn đang mở game ở thiết bị khác, hãy đăng nhập lại ở đó.',
'', '', 0, 'published', '2026-08-27 10:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('dau-hieu-tai-khoan-bi-chiem', '', 'news',
'Dấu hiệu tài khoản bị chiếm và năm việc làm ngay, theo đúng thứ tự',
'Đăng nhập bị đẩy ra, phiên lạ trong danh sách, email khôi phục bị đổi, Xu hụt không rõ lý do. Nếu gặp, làm năm việc dưới đây theo thứ tự — thứ tự có lý do của nó.',
'Phát hiện sớm và làm đúng thứ tự là hai thứ quyết định bạn giữ được tài khoản hay không.

## Dấu hiệu đáng ngờ
- Bạn đang đăng nhập bình thường thì bị đẩy ra, hoặc mật khẩu đột nhiên không đúng.
- Trong mục Bảo mật có phiên với thiết bị hoặc địa chỉ mạng bạn không hề dùng.
- Email khôi phục trong mục Bảo mật không còn là email của bạn.
- Lịch sử giao dịch có dòng Quy đổi mà bạn không thực hiện, hoặc số dư hụt không giải thích được.
- Nhân vật trong game bị mất đồ, bị đổi tên, hoặc có hoạt động vào giờ bạn không chơi.
- Bạn nhận được email đặt lại mật khẩu mà bạn không hề yêu cầu.

## Năm việc làm ngay
1. Đổi mật khẩu. Đây là việc số một vì nó vừa khoá cửa vừa đăng xuất mọi phiên khác trong cùng một thao tác. Đảo thứ tự, đăng xuất trước rồi mới đổi, là để hở một khoảng thời gian cho kẻ kia đăng nhập lại.
2. Nếu không đổi được vì mật khẩu đã bị thay: dùng Quên mật khẩu với email khôi phục. Không vào được email nữa thì chuyển thẳng sang việc thứ năm.
3. Mở mục Bảo mật, kiểm tra email khôi phục còn đúng của bạn không. Bị đổi thì đặt lại về email của bạn.
4. Xem lại danh sách phiên đang mở. Còn phiên lạ thì bấm đăng xuất mọi nơi khác.
5. Báo cho bộ phận hỗ trợ, kèm tên đăng nhập, thời điểm bạn phát hiện, các giao dịch bất thường trong lịch sử, tên game, tên máy chủ và tên nhân vật. Không gửi mật khẩu.

## Sau đó
Kiểm tra luôn email khôi phục của bạn: đổi mật khẩu email và xem thư có bị đặt chuyển tiếp tự động sang địa chỉ lạ không. Nhiều vụ chiếm tài khoản game bắt đầu từ hộp thư chứ không phải từ cổng game.

Cuối cùng, nghĩ lại xem bạn đã gõ mật khẩu ở đâu gần đây. Nếu từng đăng nhập qua một liên kết ai đó gửi, rất có thể đó là nguồn.',
'', '', 0, 'published', '2026-08-27 16:30:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('chung-toi-khong-hoi-mat-khau', '', 'news',
'Vì sao chúng tôi không bao giờ hỏi mật khẩu của bạn',
'Hệ thống không lưu mật khẩu gốc, chỉ lưu chuỗi băm không lần ngược được. Nhân viên không đọc được mật khẩu của bạn, và cũng không cần đến nó để làm bất cứ việc hỗ trợ nào.',
'Đây là một cam kết cụ thể, không phải khẩu hiệu. Bài này nói rõ cơ sở kỹ thuật của nó, để bạn có một quy tắc chắc chắn: ai hỏi mật khẩu, người đó không phải chúng tôi.

## Hệ thống không giữ mật khẩu của bạn
Khi bạn đặt mật khẩu, hệ thống lưu một chuỗi băm sinh ra từ nó bằng một thuật toán một chiều và tốn kém có chủ ý. Từ chuỗi băm không tính ngược ra mật khẩu được.

Lúc bạn đăng nhập, hệ thống băm lại thứ bạn vừa gõ rồi so hai chuỗi. Nó không bao giờ cần biết mật khẩu của bạn là gì, chỉ cần biết bạn có gõ đúng hay không.

Hệ quả trực tiếp: không nhân viên nào đọc được mật khẩu của bạn, kể cả người có quyền cao nhất trên hệ thống. Không phải vì quy định cấm, mà vì dữ liệu đó không tồn tại.

## Hỗ trợ cần gì để làm việc
- Tên đăng nhập của bạn ở cổng.
- Tên game, tên máy chủ, tên nhân vật.
- Thời điểm xảy ra sự việc và mã hoặc dòng giao dịch trong mục Lịch sử.

Với ba nhóm thông tin đó, mọi việc tra cứu và xử lý đều làm được từ phía hệ thống. Mật khẩu không nằm trong danh sách, ở bất kỳ tình huống nào.

## Những gì chúng tôi cũng không làm
- Không nhắn tin riêng cho bạn để hứa tặng vật phẩm hoặc tặng Xu.
- Không yêu cầu bạn chuyển tiền vào tài khoản cá nhân để được cộng Xu.
- Không hỏi mã trong email đặt lại mật khẩu của bạn.
- Không yêu cầu bạn cài phần mềm nào để nhận thưởng hay để sửa lỗi.

## Quy tắc cho bạn
Bất kỳ ai làm một trong bốn việc trên, dù xưng là quản trị viên, nhân viên hỗ trợ hay đại lý, đều không phải người của cổng. Đừng tranh luận với họ, chỉ cần dừng lại và kiểm tra bằng đường chính thức.',
'', '', 0, 'published', '2026-08-28 09:30:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

-- ---------------------------------------------------------------------------
-- Nhom 4 — Giai thich he thong
-- ---------------------------------------------------------------------------

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('so-nguoi-dang-choi-lay-tu-dau', '', 'news',
'Số người đang chơi trên trang lấy từ đâu',
'Con số online và trạng thái máy chủ đọc từ chính bộ đếm mà cổng vào game dùng để quyết định cho vào hay không, làm mới khoảng nửa phút một lần. Không có số nào là số trang trí.',
'Trang chủ hiện số game đang mở, số người đang chơi và số máy chủ đang mở. Bài này nói rõ những con số đó tới từ đâu và nên đọc chúng thế nào.

## Một nguồn duy nhất
Cổng hỏi thẳng từng game về tình trạng máy chủ của game đó, và dùng đúng con số ấy cho cả hai việc: hiển thị trên trang, và quyết định có cho một người mới vào máy chủ hay không.

Điều này quan trọng hơn vẻ ngoài của nó. Nếu trang lấy số từ một nơi mà cổng vào game lại quyết định theo một nơi khác, bạn sẽ gặp cảnh máy chủ hiện là còn trống nhưng vào thì bị chặn. Dùng chung một nguồn thì tình huống đó không xảy ra.

## Làm mới khoảng nửa phút một lần
Cổng giữ lại kết quả trong khoảng ba mươi giây rồi mới hỏi lại. Nhờ vậy nhiều người cùng mở trang một lúc cũng không dồn thành một loạt truy vấn liên tục vào máy chủ game.

Nghĩa là con số bạn thấy có thể trễ vài chục giây so với thực tế. Với việc chọn máy chủ thì độ trễ đó không quan trọng.

## Ba dải trạng thái
- Mượt: còn dưới ngưỡng mềm, nhận cả người mới lẫn người cũ.
- Đông: đã qua ngưỡng mềm. Người đã có nhân vật ở đó vẫn vào bình thường, người mới được hướng sang máy chủ khác.
- Đầy: đã qua cả biên tràn, tạm không nhận thêm phiên mới cho tới khi bớt người.

## Khi một game không trả lời
Nếu máy chủ của một game đang gặp sự cố hoặc đang bảo trì, trang không bịa ra một con số. Thẻ game đó sẽ hiện là chưa đọc được số liệu. Thà thiếu một con số còn hơn hiện một con số sai.

## Số đó đếm cái gì
Số người đang có mặt trong game tại thời điểm đo, cộng dồn qua các máy chủ đang chạy. Không phải số tài khoản đã đăng ký, không phải số lượt truy cập trang.',
'', '', 0, 'published', '2026-08-29 10:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('vi-sao-doi-luc-phai-cho', '', 'news',
'Vì sao đôi lúc phải chờ mới vào được game',
'Có một cổng đếm số người vào trước khi chuyển bạn tới máy chủ game. Nó chặn theo ba tầng ngưỡng và cố tình đếm dư một chút. Chờ vài phút thường là đủ.',
'Giữa lúc bạn bấm Chơi ngay và lúc game hiện ra, có một bước bạn không thấy: cổng kiểm tra máy chủ đích còn chỗ hay không rồi mới cấp phép cho bạn đi tiếp.

## Vì sao phải có bước đó
Máy chủ game nhận quá nhiều người cùng lúc thì mọi người cùng chậm, và nặng hơn là mọi người cùng văng. Chặn sớm ở cửa giữ cho người đang chơi bên trong không bị ảnh hưởng vì một đợt vào ồ ạt.

## Ba tầng ngưỡng
Cổng kiểm tra từ trong ra ngoài:
- Ngưỡng của từng máy chủ. Mỗi máy chủ có một mức riêng, đặt theo sức chứa thật của nó.
- Ngưỡng của máy vật lý. Nhiều máy chủ có thể cùng chạy trên một máy, nên tổng của chúng cũng bị giới hạn.
- Mức toàn game. Tầng này không dùng để chặn, chỉ để bộ phận vận hành theo dõi dung lượng chung và biết khi nào cần mở thêm máy chủ.

Chỉ cần một trong hai tầng đầu chạm ngưỡng là bạn bị giữ lại ở cửa.

## Cổng cố tình đếm dư một chút
Số người đang chơi mà máy chủ game báo về luôn trễ một nhịp. Nếu chỉ tin con số đó, một đợt vào cùng lúc sẽ lọt hết qua cửa trước khi máy chủ kịp báo là đã đầy.

Vì thế cổng cộng thêm số lượt vừa được cấp phép kể từ lần báo gần nhất. Kết quả là đôi khi bạn bị giữ lại trong lúc con số hiển thị trông vẫn còn chỗ. Đó là chủ ý, không phải lỗi.

## Bạn nên làm gì
- Chờ vài phút rồi thử lại. Người ra khỏi game là chỗ trống lại.
- Nếu bạn chưa có nhân vật, chọn một máy chủ đang Mượt. Trang chủ của game có sẵn dòng gợi ý máy chủ cho người mới.
- Nếu bạn đã có nhân vật, hệ thống luôn đưa bạn về đúng máy chủ của nhân vật đó, kể cả khi máy chủ đang Đông. Nhân vật gắn với máy chủ, nên chuyển sang máy chủ khác nghĩa là chơi lại từ đầu.
- Giờ cao điểm buổi tối là lúc dễ gặp nhất. Vào sớm hơn hoặc muộn hơn một chút thường là xong.

## Điều bước này không làm
Nó không giới hạn thời gian chơi của bạn và không đá bạn ra khi đã vào được. Nó chỉ đứng ở cửa.',
'', '', 0, 'published', '2026-08-29 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('vat-pham-bao-lau-thi-toi', '', 'news',
'Mua xong bao lâu thì vật phẩm tới, và tìm nó ở đâu',
'Lệnh phát hàng chạy ngay khi bạn xác nhận, thường xong trong khoảng một phút. Chỗ tìm quà thì khác nhau tuỳ loại gói: có gói vào thẳng nhân vật, có gói nằm trong hòm thư trong game.',
'Phần lớn thắc mắc kiểu mua rồi mà không thấy đâu thật ra là tìm nhầm chỗ. Bài này nói rõ đường đi của một đơn.

## Đường đi của một đơn
Bạn xác nhận, Xu bị trừ ngay và một đơn được tạo ở trạng thái Đang xử lý. Cổng gửi lệnh phát hàng sang máy chủ game. Máy chủ game phát hàng rồi trả lời, đơn chuyển sang Đã phát. Toàn bộ thường xong trong khoảng một phút.

Trạng thái đơn tự cập nhật trên trang, bạn không cần tải lại.

## Tìm quà ở đâu
Tuỳ loại gói, và trang gói ghi rõ:
- Gói được game xử lý như một lần nạp, gồm các mốc Nguyên Bảo, thẻ, quỹ, đặc quyền và gói ngày: phần thưởng vào thẳng nhân vật ở máy chủ bạn chọn. Vào game là thấy, không qua hòm thư.
- Gói vật phẩm: gửi bằng thư trong game. Vào game, mở hòm thư của đúng nhân vật đã chọn lúc mua, bấm nhận.

## Nếu vào game mà chưa thấy
- Kiểm tra bạn đang ở đúng nhân vật và đúng máy chủ đã chọn lúc mua. Đây là nguyên nhân thường gặp nhất.
- Thoát và vào lại game để tải lại hòm thư và dữ liệu nhân vật. Nếu bạn đang mở game từ trước lúc mua, phía game có thể vẫn đang hiển thị dữ liệu cũ.
- Xem lại trạng thái đơn ở trang cửa hàng hoặc mục Tổng quan trong tài khoản.

## Thư có hạn lưu
Hòm thư trong game giữ thư trong một khoảng thời gian rồi tự dọn. Nhận sớm, đừng để tồn.

## Nếu đơn báo Đã hoàn Xu
Nghĩa là máy chủ game từ chối, thường vì điều kiện của gói chưa thoả, và Xu đã quay lại ví. Bạn không mất gì, kiểm tra lại điều kiện rồi mua lại nếu muốn.

## Nếu đơn nằm ở Đang xử lý quá lâu
Tải lại trang trước. Vẫn vậy thì báo hỗ trợ, kèm thời điểm tạo đơn, tên gói, tên máy chủ và tên nhân vật.',
'', '', 0, 'published', '2026-08-30 10:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('choi-tren-dien-thoai', '', 'news',
'Chơi trên điện thoại: chuẩn bị cho lần vào đầu tiên',
'Game chạy trong trình duyệt điện thoại, không cần cài ứng dụng. Lần vào đầu phải tải khá nhiều dữ liệu nên hãy dùng Wi-Fi và đừng dùng chế độ ẩn danh.',
'Không có bản cài, không qua kho ứng dụng: bạn mở trình duyệt của điện thoại, đăng nhập, rồi vào game. Cùng tài khoản và cùng nhân vật với khi chơi trên máy tính.

## Nên dùng gì
- Bản mới của Chrome trên Android, hoặc Safari trên iPhone và iPad. Trình duyệt cũ thường thiếu tính năng đồ hoạ mà game cần.
- Wi-Fi cho lần vào đầu tiên. Game phải tải một lượng tài nguyên đáng kể, và dùng dữ liệu di động vừa lâu vừa tốn.
- Còn dung lượng trống trên máy. Trình duyệt giữ lại tài nguyên đã tải để lần sau vào nhanh hơn nhiều.

## Vì sao lần đầu lâu
Toàn bộ hình ảnh, hiệu ứng và dữ liệu của game phải về máy bạn. Những lần sau, trình duyệt lấy lại từ bộ nhớ đệm nên nhanh hơn hẳn.

Vì thế đừng chơi ở chế độ ẩn danh hay riêng tư: chế độ đó xoá sạch bộ nhớ đệm khi bạn đóng tab, và lần nào vào cũng phải tải lại từ đầu.

## Mẹo cho trải nghiệm dễ chịu hơn
- Bật tự xoay màn hình để game hiển thị đúng chiều của nó.
- Đóng bớt tab và ứng dụng nền trước khi vào, nhất là trên máy đời cũ.
- Cắm sạc nếu định chơi lâu. Game đồ hoạ trong trình duyệt tốn pin.
- Lưu trang cổng vào màn hình chính để lần sau mở nhanh, và để không phải tìm lại qua công cụ tìm kiếm.

## Nếu đứng ở màn hình tải
- Tải lại trang. Đây là cách xử lý nhanh nhất và hiệu quả nhất.
- Đổi mạng, ví dụ từ Wi-Fi yếu sang mạng di động hoặc ngược lại.
- Thử trình duyệt khác trên cùng máy.
- Máy quá cũ hoặc đầy bộ nhớ thì tải rất chậm; giải phóng bớt dung lượng rồi thử lại.

## Chuyển giữa điện thoại và máy tính
Không cần làm gì. Cùng một tài khoản, cùng một nhân vật, cùng một tiến độ. Ví Xu cũng vậy.',
'', '', 0, 'published', '2026-08-31 09:30:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('nhan-vat-co-dung-chung-khong', '', 'news',
'Một tài khoản chơi nhiều game thì nhân vật có dùng chung không',
'Không. Tài khoản và ví Xu dùng chung, nhưng nhân vật, tiến độ và tiền trong game thì riêng theo từng game, và riêng theo từng máy chủ trong cùng một game.',
'Câu hỏi này hay gặp, và câu trả lời có hai tầng: riêng theo game, và riêng theo máy chủ.

## Riêng theo từng game
Mỗi game bạn mở là một tài khoản game riêng bên trong game đó, dù xuất phát từ cùng một tài khoản cổng. Nhân vật, cấp độ, kho đồ, Nguyên Bảo và mọi tiến độ đều nằm trong game đó và không chuyển đi đâu được.

Nguyên Bảo là tiền của một game cụ thể. Nguyên Bảo ở game này không dùng được ở game kia, và cũng không đổi ngược thành Xu.

## Riêng theo từng máy chủ
Trong cùng một game, mỗi máy chủ là một thế giới tách biệt. Nhân vật bạn tạo ở máy chủ A không xuất hiện ở máy chủ B, và tiến độ hai bên không cộng vào nhau.

Bạn tạo được nhân vật ở nhiều máy chủ, mỗi nơi một tiến độ riêng. Nhưng đừng chia sức: dồn vào một nhân vật thường đi xa hơn nhiều.

## Cái gì thật sự dùng chung
- Tên đăng nhập và mật khẩu.
- Ví Xu và số dư.
- Lịch sử giao dịch của toàn bộ các game.
- Danh sách phiên đăng nhập và các thiết lập bảo mật.

## Hệ quả khi mua gói
Xu trừ từ ví chung, nhưng hàng phát về đúng một nhân vật ở đúng một máy chủ của đúng một game. Đó là lý do trang xác nhận bắt bạn chọn nhân vật, và tại sao chọn nhầm thì không chuyển được.

## Chơi cùng bạn bè
Phải cùng game và cùng máy chủ. Rủ nhau chơi thì thống nhất máy chủ trước khi ai đó tạo nhân vật, vì tạo rồi thì chuyển sang máy chủ khác nghĩa là bắt đầu lại.

## Xem lại mình có gì ở đâu
Vào Tài khoản, mục Nhân vật. Ở đó liệt kê từng game bạn đã mở kèm máy chủ, và nút vào thẳng game đó.',
'', '', 0, 'published', '2026-09-01 10:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

-- ---------------------------------------------------------------------------
-- Nhom 5 — Gioi thieu game va van hanh
-- ---------------------------------------------------------------------------

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('dai-hai-trinh-cho-nguoi-moi', '', 'news',
'Đại Hải Trình cho người mới: ba ngày đầu nên làm gì',
'Game đấu tướng rảnh tay chạy thẳng trên trình duyệt. Bài này là một kế hoạch ngắn cho ba ngày đầu: chọn máy chủ, dựng đội hình, và hai thói quen nên có ngay từ hôm đầu tiên.',
'Đại Hải Trình là game đấu tướng rảnh tay, chơi trong trình duyệt, không có bản cài. Bạn thu thập tướng, xếp họ ra trận theo vị trí, rồi trận đánh tự diễn ra. Thắng thua nằm ở chỗ chọn ai và nuôi tướng nào trước, không ở tốc độ bấm.

## Ngày đầu: chọn máy chủ cho đúng
Nhân vật gắn với máy chủ, và gói mua trên web cũng phát về đúng máy chủ có nhân vật. Chọn xong thì nên chơi ổn định ở đó.

Người mới cứ theo dòng gợi ý máy chủ trên trang chủ của game, hoặc chọn một máy chủ đang Mượt ở trang Máy chủ. Rủ bạn bè cùng chơi thì thống nhất máy chủ trước khi ai đó tạo nhân vật.

Sau đó đi theo tuyến nhiệm vụ mở đầu. Nó lần lượt mở các chức năng cho bạn: chiêu mộ tướng, xếp đội hình, đẩy ải phiêu lưu, phó bản hàng ngày. Đừng vội bỏ qua.

## Ngày hai: dựng một đội hình có trọng tâm
Hai điều đáng biết sớm:
- Sức mạnh đến từ tướng nhiều hơn từ trang bị. Dồn tài nguyên cho vài tướng chủ lực thay vì rải đều cho cả kho.
- Vị trí đứng có ảnh hưởng. Gặp một ải khó, đổi thứ tự trong đội hình rồi đánh lại là cách rẻ nhất trước khi nghĩ tới chuyện nạp.

Ngoài tướng còn nhiều hệ thống khác cùng cộng sức mạnh cho cả đội, nên càng về sau càng có nhiều hướng để mạnh lên. Ba ngày đầu chưa cần lo tới chúng.

## Ngày ba: hai thói quen
- Nhận quà treo máy mỗi lần vào. Đội hình vẫn kiếm tài nguyên ở ải xa nhất bạn đã qua kể cả khi bạn đóng trang, nên vào nhận rồi đẩy tiếp là vòng lặp chính của game.
- Điểm danh hằng ngày và làm phó bản hàng ngày. Đây là nguồn tài nguyên đều đặn nhất, và bỏ ngày nào là mất ngày đó.

## Khi nào cần Xu
Chưa cần ngay. Khi cần, mở Cửa hàng trên trang web của game: chọn gói, chọn nhân vật nhận, xác nhận. Nếu game từ chối vì gói có điều kiện, Xu được hoàn lại ví tự động.

## Có gì để đánh về sau
Ngoài tuyến chính còn phó bản hàng ngày, các tháp thử thách, BOSS thế giới và BOSS công hội, đấu trường, công hội chiến, cùng những hoạt động liên server dùng chung bảng xếp hạng của nhiều máy chủ.',
'', '', 0, 'published', '2026-09-02 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('lien-he-ho-tro', '', 'news',
'Liên hệ hỗ trợ: gửi kèm gì để được xử lý nhanh',
'Kênh liên hệ chính thức, khi được công bố, nằm ở chân trang. Trước khi gửi, hãy chuẩn bị năm thông tin dưới đây — thiếu chúng thì mọi việc tra cứu đều phải hỏi lại từ đầu.',
'Nhiều việc bạn tự xử lý được trong mục Tài khoản, nhanh hơn chờ trả lời. Bài này nói khi nào cần người xem giúp và cần gửi kèm gì.

## Trước hết, những việc tự làm được
- Quên mật khẩu: dùng chức năng Quên mật khẩu với email khôi phục.
- Nghi có người khác vào tài khoản: đổi mật khẩu ở mục Bảo mật, việc đó tự đăng xuất mọi phiên khác.
- Mua rồi chưa thấy vật phẩm: kiểm tra trạng thái đơn, rồi mở hòm thư trong game của đúng nhân vật đã chọn.
- Xu bị trừ mà đơn không thành: xem lịch sử, dòng Hoàn xuất hiện là Xu đã quay lại ví.

## Kênh chính thức
Đường liên hệ chính thức, khi được công bố, luôn nằm ở chân trang của mọi trang trong cổng. Nếu chân trang chưa có liên kết nào, nghĩa là kênh chưa mở — và bất kỳ ai nhắn riêng cho bạn tự nhận là hỗ trợ đều đáng ngờ.

## Năm thứ cần gửi kèm
- Tên đăng nhập ở cổng. Không gửi mật khẩu, không ai cần đến nó.
- Tên game, tên máy chủ, tên nhân vật.
- Thời điểm xảy ra, càng chính xác càng tốt, cả ngày lẫn giờ.
- Với việc liên quan tới Xu: dòng giao dịch tương ứng trong mục Lịch sử, hoặc trạng thái đơn.
- Ảnh chụp màn hình nếu có, chụp cả thanh địa chỉ và phần thông báo lỗi.

Mọi giao dịch đều được ghi theo tài khoản và thời điểm, nên có đủ những thứ trên là tra ra ngay. Thiếu chúng thì cuộc trao đổi bắt đầu bằng một vòng hỏi lại, và bạn chờ lâu hơn.

## Viết thế nào
Nói việc bạn định làm, việc thực tế xảy ra, và bạn đã thử những gì. Ba câu đó có ích hơn một đoạn dài kể lại cảm giác.

## Điều bộ phận hỗ trợ không làm
Không hỏi mật khẩu, không hỏi mã trong email đặt lại mật khẩu, không nhắn riêng hứa tặng quà, và không yêu cầu bạn chuyển tiền vào tài khoản cá nhân.',
'', '', 0, 'published', '2026-09-03 10:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('quy-tac-cong-dong', '', 'news',
'Quy tắc cộng đồng và các mức xử lý',
'Bốn nhóm hành vi bị cấm, và bốn mức xử lý: nhắc nhở, cấm chat, khoá tài khoản, thu hồi vật phẩm phát sai. Bài này nói rõ ranh giới để không ai bị bất ngờ.',
'Quy tắc dưới đây áp dụng cho mọi game trên cổng. Chúng ngắn, và có lý do thực tế đằng sau từng điều.

## Bốn nhóm hành vi bị cấm
- Can thiệp kỹ thuật: dùng phần mềm sửa game, công cụ chơi tự động, hoặc lợi dụng lỗi phần mềm để trục lợi. Nếu bạn phát hiện một lỗi cho phép nhân đồ hay nhân tiền, hãy báo thay vì khai thác.
- Giao dịch ngoài hệ thống: mua bán, cho thuê, chuyển nhượng tài khoản; mua bán Xu hoặc vật phẩm bằng tiền mặt bên ngoài. Những giao dịch này không có gì bảo vệ bạn, và là nguồn của phần lớn các vụ mất tài khoản.
- Quấy rối và nội dung vi phạm: xúc phạm người khác, đặt tên nhân vật hoặc phát ngôn trái pháp luật và thuần phong mỹ tục, spam kênh chat.
- Tấn công hệ thống: dò tìm, gây quá tải, hoặc can thiệp vào hoạt động của máy chủ và của cổng.

## Bốn mức xử lý
Tuỳ mức độ và tính lặp lại:
- Nhắc nhở.
- Cấm chat có thời hạn.
- Khoá tài khoản tạm thời hoặc vĩnh viễn.
- Thu hồi vật phẩm và tiền trong game phát sai do khai thác lỗi.

Vật phẩm bị thu hồi trong trường hợp cuối không kèm hoàn Xu, vì chúng vốn không được phát hợp lệ.

## Điều này không đụng tới
Chơi nhiều nhân vật, chơi ở nhiều máy chủ, hay chơi nhiều game trên cùng một tài khoản đều bình thường và được phép.

## Nếu bạn bị xử lý mà cho là oan
Liên hệ qua kênh chính thức ở chân trang, kèm tên đăng nhập, tên máy chủ, tên nhân vật và thời điểm. Mọi thao tác của bộ phận vận hành đều ghi nhật ký, nên việc tra lại là làm được.

## Báo cáo người khác vi phạm
Gửi kèm tên máy chủ, tên nhân vật bị báo cáo, thời điểm và ảnh chụp màn hình. Không có ba thứ đó thì báo cáo rất khó xử lý.',
'', '', 0, 'published', '2026-09-04 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('dang-lam-tiep', '', 'notice',
'Những gì đang được làm tiếp',
'Bốn việc đang dở và được nói thẳng: cổng nạp Xu ngay trong tài khoản, bộ ảnh thương hiệu của game, phần pháp lý trong Điều khoản và Chính sách, và việc đưa thêm game lên cổng.',
'Cổng đang trong giai đoạn chuyển đổi. Thay vì để bạn tự đoán chỗ nào chưa xong, đây là danh sách những việc đang dở. Không có mốc thời gian nào trong bài này, vì hứa một ngày rồi lỡ hẹn còn tệ hơn là không hứa.

## Nạp Xu ngay trong trang tài khoản
Hiện nút Nạp Xu ở trang Ví đang tắt, và bạn nạp qua trang của game. Xu vẫn về đúng ví tài khoản cổng, nên việc này không ảnh hưởng tới số dư hay lịch sử của bạn — chỉ là đi vòng hơn.

Đường nạp mới ngay trong trang tài khoản đang được làm. Khi xong, nút sẽ bật và có thông báo ở mục Tin tức.

## Bộ ảnh thương hiệu của game
Một số hình ảnh trên trang game vẫn là bộ ảnh cũ từ trước khi đổi tên, nên logo có thể không khớp với tên game đang hiển thị. Đây là việc thay ảnh, không ảnh hưởng gì tới tài khoản, nhân vật hay giao dịch.

## Phần pháp lý trong Điều khoản và Chính sách
Hai trang Điều khoản sử dụng và Chính sách bảo mật đã có đủ phần nói về tài khoản, ví, dữ liệu và quyền của bạn. Riêng các mục về pháp nhân, giấy phép và đầu mối tiếp nhận khiếu nại còn đang chờ điền, và chúng được đánh dấu rõ trên trang chứ không giấu đi.

## Thêm game lên cổng
Hệ thống được dựng để chạy nhiều game trên cùng một tài khoản và một ví. Khi có game mới, bạn không phải đăng ký lại và cũng không phải chia Xu theo game.

## Cách báo lỗi
Nếu bạn gặp thứ gì trông sai, hãy báo qua kênh chính thức ở chân trang, kèm ảnh chụp màn hình và thời điểm. Danh sách trên là những gì chúng tôi đã biết, không phải tất cả những gì có thể sai.',
'', '', 0, 'published', '2026-09-05 20:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);
