-- 25 bai cho game `haitac` (Dai Hai Trinh), bang `news` (migration 0010 + cot `slug`).
--
-- Moi bai la mot INSERT ... ON DUPLICATE KEY UPDATE khoa theo `slug`, nen nap lai file nay
-- KHONG nhan ban tin: chay lan hai chi ghi de dung 25 dong do.
--
-- Noi dung deu tra tu du lieu that cua ban trien khai nay, khong bia su kien, moc thoi gian
-- hay so lieu:
--   - server/excel-src/  (adventure, common/功能开启 + 全局变量, daily-dungeon, arena,
--     tower-of-heaven, race-tower, endless-trial, thirty-six-heavens, combat, hero,
--     equipment-table, hero-summon, collection, guild, guild-war, championship,
--     cross-ladder, cross-arena, 榜单, main-character, recharge-benefit)
--   - docs/design-cua-hang.md muc 1 (tien te, 8 moc nap, x2 lan dau, hai duong phat hang)
--   - trang that https://haitac.antfarms.xyz va /cua-hang (8 nhom goi, ba dai trang thai)
--
-- Khong co bai nao `kind='event'`: hien khong co su kien nao dang chay. Dung mot bai `pinned=1`.
-- `body` la van ban thuan: doan cach nhau bang dong trong, "## " mo tieu de phu, "- " gach dau dong.

SET NAMES utf8mb4;

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-choi-the-nao', 'haitac', 'news', 'Đại Hải Trình chơi thế nào',
  'Đấu tướng rảnh tay chạy thẳng trên trình duyệt: bạn thu thập tướng, xếp đội hình rồi để trận đánh tự diễn ra. Bài này tóm tắt vòng chơi cơ bản và những gì có trong game.',
  'Đại Hải Trình là game đấu tướng rảnh tay. Bạn không điều khiển từng đòn đánh: việc của bạn là chọn tướng, xếp họ vào đội hình, nuôi đúng người, rồi bấm đánh và xem kết quả.

## Vòng chơi cơ bản

- Chiêu mộ tướng và ghép mảnh để có thêm tướng mới.
- Xếp đội hình: chọn ai ra trận và đứng ở đâu.
- Đẩy ải trong bản đồ phiêu lưu — 16 chương, 1.000 ải.
- Nhận tài nguyên treo máy, dùng chúng nâng tướng và trang bị, rồi quay lại đẩy tiếp.

Khi ải trước mặt quá khó, thứ cần đổi thường là đội hình hoặc mức nuôi tướng, chứ không phải thao tác.

## Cấp phiêu lưu mở dần mọi thứ

Nhân vật chính có cấp riêng, gọi là cấp phiêu lưu, tối đa 210. Gần như mọi chức năng đều gắn với cấp này: chiêu mộ mở ở cấp 2, phó bản hằng ngày cấp 3, đấu trường cấp 8, Thông Thiên Tháp cấp 10, công hội cấp 15. Vì vậy trong những ngày đầu, đẩy ải để lên cấp là việc mở khoá được nhiều thứ nhất.

## Ngoài tuyến chính có gì

- Phó bản hằng ngày: năm loại tài nguyên, mỗi loại chín bậc khó.
- Các tháp: Thông Thiên Tháp, năm tháp chủng tộc chia theo ngày trong tuần, Thí luyện vô tận, Tam Thập Lục Trùng Thiên.
- Đấu trường và giải vô địch của máy chủ.
- Công hội: đóng góp, kỹ năng chung, phó bản riêng và công hội chiến.
- Các hoạt động dùng chung nhiều máy chủ, phần lớn mở ở cấp phiêu lưu 70.

## Chơi ở đâu

Game chạy trong trình duyệt. Máy tính và điện thoại dùng chung một tài khoản và một tiến độ, không có bản cài, không qua kho ứng dụng. Lần vào đầu tiên phải tải khá nhiều tài nguyên nên chậm hơn các lần sau.',
  '', '', 1, 'published', '2026-08-20 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-tao-nhan-vat-va-chon-may-chu', 'haitac', 'news', 'Tạo nhân vật và chọn máy chủ',
  'Tài khoản dùng chung cho mọi game trong cổng, còn nhân vật thì thuộc về một máy chủ và không chuyển đi đâu được. Vài điều nên cân nhắc trước khi bấm vào.',
  'Bạn cần đúng hai thứ để bắt đầu: một tài khoản của cổng, và một máy chủ.

## Tài khoản

Đăng ký ở trang tài khoản của hệ thống, chỉ cần tên đăng nhập và mật khẩu. Tài khoản này dùng cho mọi game trong cổng nên lần sau không phải đăng ký lại. Khi bạn đã đăng nhập ở cổng, game không hỏi mật khẩu lần thứ hai.

## Chọn máy chủ

Bấm Chơi ngay thì hệ thống chọn giúp một máy chủ đang thoáng, nếu bạn chưa có nhân vật nào. Muốn tự chọn thì mở trang Máy chủ và xem trạng thái từng máy: Mượt, Đông hay Đầy.

Vài điều nên biết trước khi quyết định:

- Nhân vật thuộc về máy chủ đã tạo ra nó. Không có cách chuyển nhân vật sang máy chủ khác.
- Muốn chơi cùng bạn bè thì phải cùng máy chủ. Công hội, đấu trường, bạn bè và phần lớn bảng xếp hạng đều tính trong phạm vi một máy chủ.
- Một tài khoản tạo được nhân vật ở nhiều máy chủ, mỗi nơi một tiến độ riêng. Ví Xu thì chỉ có một và dùng chung.

## Sau khi vào

Game hỏi tên nhân vật rồi dẫn bạn qua vài ải đầu tiên. Cứ đi theo tuyến nhiệm vụ chính: nó lần lượt mở chiêu mộ, đội hình, phó bản và các chức năng còn lại theo đúng thứ tự hợp lý.

## Đã có nhân vật rồi

Bấm Chơi ngay là vào thẳng máy chủ của nhân vật đó, kể cả khi máy chủ đang Đông. Hệ thống chỉ gợi ý máy chủ mới cho người chưa có nhân vật nào.

Gói mua ở cửa hàng web cũng phát về đúng máy chủ và nhân vật bạn chọn lúc mua, nên chơi ổn định ở một nơi sẽ đỡ rắc rối về sau.',
  '', '', 0, 'published', '2026-08-20 15:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-chuc-nang-mo-o-cap-nao', 'haitac', 'news', 'Chức năng nào mở ở cấp nào',
  'Gần như mọi mục trong game đều khoá theo cấp phiêu lưu của nhân vật chính. Danh sách mốc mở của những chức năng bạn sẽ dùng nhiều nhất.',
  'Thấy một mục bị mờ hoặc không tìm ra chức năng nào đó thì phần lớn là do chưa đủ cấp, không phải lỗi. Dưới đây là mốc mở theo cấp phiêu lưu.

## Cấp 1 đến 5

- Treo máy, tuyến nhiệm vụ chính và nhiệm vụ hằng ngày: có ngay từ cấp 1.
- Cửa hàng, hòm thư, tiệm rèn và thần binh: cấp 1.
- Bảng xếp hạng: cấp 1.
- Chiêu mộ tướng: cấp 2.
- Phó bản hằng ngày: cấp 3.
- Chiến nhanh: cấp 4.
- Bạn bè, nhiệm vụ treo thưởng và tầm bảo: cấp 5.

## Cấp 7 đến 20

- Điểm danh: cấp 7.
- Đấu trường và giải vô địch: cấp 8.
- Thông Thiên Tháp, thành tựu và lịch sử đấu: cấp 10.
- Công hội — trong game gọi là Bang — cùng công hội chiến và BOSS công hội: cấp 15.
- Quán rượu: cấp 18.
- Hoàn tướng: cấp 20.

## Cấp 25 trở lên

- Viêm Đế Thí luyện: cấp 25.
- Đảo Đào Hoa: cấp 30.
- Thí luyện và tìm lại tài nguyên: cấp 40.
- Quét tháp tự động ở Thông Thiên Tháp: cấp 40.
- Phần lớn hoạt động liên máy chủ, Lăng Tiêu Bảo Điện, Động Thiên Phúc Địa: cấp 70.

## Cách lên cấp nhanh nhất

Kinh nghiệm của nhân vật chính đến chủ yếu từ đẩy ải tuyến chính và từ treo máy. Nên khi muốn mở một chức năng cụ thể, việc đáng làm là nâng đội hình rồi đẩy thêm ải, chứ không phải làm đi làm lại các mục đã mở.

Cấp phiêu lưu tối đa là 210, nên còn rất nhiều thứ mở dần về sau.',
  '', '', 0, 'published', '2026-08-21 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-treo-may-va-chien-nhanh', 'haitac', 'news', 'Treo máy: đội hình vẫn kiếm khi bạn đóng trang',
  'Đội hình treo máy ở ải xa nhất bạn đã qua, và mỗi ải có bảng rơi đồ riêng. Bài này nói cách phần treo máy được tính, chiến nhanh dùng để làm gì và VIP ảnh hưởng ra sao.',
  'Đây là phần rảnh tay của game: đội hình vẫn kiếm tài nguyên khi bạn không mở trang.

## Treo ở đâu thì được gì

Đội hình treo máy tại ải xa nhất bạn đã qua trong bản đồ phiêu lưu. Mỗi ải trong 1.000 ải có bảng rơi đồ riêng cho lúc treo máy, kèm mức kinh nghiệm nhân vật, kinh nghiệm tướng, kim tệ và ngân lượng riêng.

Nghĩa là đẩy được xa hơn thì phần treo máy vừa nhiều hơn vừa ra thứ tốt hơn. Khi thấy tài nguyên về chậm, việc đáng làm không phải là chờ lâu hơn mà là đẩy thêm vài ải.

## Chiến nhanh

Chiến nhanh mở ở cấp 4. Mỗi lượt thu ngay phần treo máy của 120 phút, khỏi phải chờ. Mỗi ngày có một lượt miễn phí, và mua thêm được ba lượt nữa bằng Kim Cương với giá tăng dần.

Đây là cách hợp lý để dùng Kim Cương trong giai đoạn đầu, vì nó rút ngắn đúng thứ đang chặn bạn là thời gian.

## Thưởng khi đang mở game

Ngoài phần treo máy còn một chuỗi thưởng tính theo thời gian bạn ở trong game, mốc rải từ vài phút đến vài giờ. Qua mốc thì bấm nhận.

## VIP ảnh hưởng tới treo máy

Cấp VIP có một hệ số nhân cho kinh nghiệm treo máy: cấp càng cao thì cùng một khoảng thời gian cho nhiều kinh nghiệm hơn. Điểm VIP cộng khi bạn nạp, và cả khi mua gói ở cửa hàng web — vì game xử lý các gói đó như một lần nạp.

## Thói quen gọn nhất

- Vào game, nhận phần treo máy trước.
- Dùng ngay tài nguyên vừa nhận để nâng tướng, rồi thử đẩy ải.
- Đẩy tới khi thua hai ba lần liên tiếp thì dừng; chỗ đó là trần hiện tại.
- Trước khi thoát, xem lại nhiệm vụ hằng ngày còn sót gì không.',
  '', '', 0, 'published', '2026-08-21 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-ngay-dau-nen-lam-gi', 'haitac', 'news', 'Ngày đầu nên làm gì',
  'Một trình tự gọn cho buổi chơi đầu tiên: đi hết tuyến nhiệm vụ chính, mở chiêu mộ và phó bản, rồi dồn tài nguyên cho vài tướng thay vì rải đều.',
  'Ngày đầu không cần tính toán nhiều. Có bốn việc đáng làm, theo thứ tự.

## 1. Đi hết tuyến nhiệm vụ chính

Tuyến nhiệm vụ chính là thứ mở khoá mọi chức năng khác. Cứ bấm theo nó cho tới khi hết việc được gợi ý. Trong lúc đó bạn sẽ lần lượt mở chiêu mộ ở cấp 2, phó bản hằng ngày ở cấp 3, chiến nhanh ở cấp 4, bạn bè và nhiệm vụ treo thưởng ở cấp 5.

## 2. Chiêu mộ và chọn ra vài tướng để nuôi

Chiêu mộ cơ bản và chiêu mộ cao cấp mỗi loại cho một lượt miễn phí mỗi 24 giờ, nên nhớ quay lại lấy. Sau khi có một nhóm tướng, đừng nâng đều tay: sức mạnh trong game này đến từ vài tướng được nuôi sâu, không phải từ nhiều tướng cấp thấp.

Lý do rất cụ thể: trần cấp của tướng bị khoá theo bậc tiến giai và số sao, nên tướng không được tiến giai sẽ đứng ở cấp 30 dù bạn có bao nhiêu kinh nghiệm.

## 3. Làm hết nhiệm vụ hằng ngày

Danh sách nhiệm vụ hằng ngày gồm những việc bạn vốn đã làm: đăng nhập, tặng quà bạn bè, chiêu mộ, đánh phó bản hằng ngày, đánh Thông Thiên Tháp, đấu trường, nhiệm vụ treo thưởng, hợp thành trang bị, chiến nhanh. Làm gọn trong ngày là đủ độ sinh động để nhận rương.

## 4. Treo máy và quay lại

Phần treo máy tính theo ải xa nhất đã qua, nên trước khi tắt hãy đẩy thêm vài ải. Lần vào sau nhận phần tích được, nâng tướng, rồi đẩy tiếp.

## Chưa cần vội

Công hội mở ở cấp 15, các hoạt động liên máy chủ mở ở cấp 70. Ngày đầu chưa phải lo tới chúng. Cũng chưa cần mua gì: Kim Cương trong giai đoạn này dùng cho chiến nhanh và mua thêm lượt phó bản là hợp lý hơn cả.',
  '', '', 0, 'published', '2026-08-22 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-nham-lan-thuong-gap', 'haitac', 'news', 'Sáu nhầm lẫn thường gặp của người mới',
  'Rải kinh nghiệm cho cả kho tướng, quên rằng trần cấp bị khoá theo tiến giai và sao, bỏ phí lượt miễn phí mỗi ngày, và vài chỗ khác hay mất tài nguyên oan.',
  'Những chỗ dưới đây không làm hỏng tài khoản, nhưng làm bạn chậm hơn cần thiết.

## Rải kinh nghiệm cho cả kho tướng

Trần cấp của tướng bị khoá theo bậc tiến giai và số sao: chưa tiến giai thì dừng ở cấp 30, phải tiến giai 2 kèm 2 sao mới qua được cấp 40, và tiến giai 6 kèm 6 sao mới qua được cấp 100. Nuôi mười tướng cùng lúc chỉ dẫn tới mười tướng cùng đứng ở trần.

## Tưởng lực chiến cao là chắc thắng

Lực chiến là một con số gộp để so nhanh. Nó không tính việc đội bạn có đủ người đỡ đòn hay không, có ai hồi máu hay không, và các tướng cùng hệ có cộng hưởng với nhau hay không. Thua một ải mà lực chiến cao hơn đối thủ là chuyện bình thường, và cách chữa thường là đổi đội hình.

## Bỏ phí lượt miễn phí

Mỗi ngày có nhiều lượt miễn phí tự làm mới: một lượt chiêu mộ cơ bản, một lượt chiêu mộ cao cấp, hai lượt Thông Thiên Tháp, hai lượt cho mỗi phó bản hằng ngày, ba lượt đấu trường, một lượt chiến nhanh, hai lần làm mới nhiệm vụ treo thưởng. Không dùng thì mất.

## Đổi máy chủ giữa chừng

Nhân vật gắn với máy chủ và không chuyển được. Tạo nhân vật mới ở máy chủ khác nghĩa là bắt đầu lại từ đầu, còn ví Xu thì vẫn chung.

## Mua gói mà chọn nhầm nhân vật

Gói ở cửa hàng web phát về đúng nhân vật và máy chủ bạn chọn lúc xác nhận. Đã phát rồi thì không chuyển sang nhân vật khác được, nên hãy đọc lại dòng nơi nhận trước khi bấm.

## Bỏ quên hòm thư

Quà hoạt động, đền bù và các gói thuộc nhóm vật phẩm đều vào hòm thư trong game. Thư có hạn lưu, để tồn lâu là mất.',
  '', '', 0, 'published', '2026-08-22 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-doi-hinh-va-tran-phap', 'haitac', 'news', 'Đội hình và trận pháp hoạt động ra sao',
  'Trận pháp quyết định bạn có những ô đứng nào, còn tướng cùng hệ đứng chung thì cộng hưởng theo số lượng. Hai thứ này quan trọng hơn việc thay một tướng mạnh hơn.',
  'Đội hình là nơi bạn ra quyết định thật sự, vì trận đánh tự diễn ra.

## Trận pháp

Có sáu trận pháp, đặt tên theo màu: Đỏ, Tím, Cam, Vàng, Lục, Lam. Chúng mở lần lượt ở cấp 1, 20, 30, 40, 50 và 60.

Mỗi trận pháp mở sáu ô đứng trong một lưới chín ô, và các trận pháp chiếm những ô khác nhau. Đổi trận pháp là đổi hình dạng đội hình: có trận dồn về sau, có trận trải rộng hai bên. Vì vậy mở được trận pháp mới thì nên thử lại đội hình cũ trên nền trận mới, chứ đừng mặc định giữ nguyên.

Trận pháp còn nâng cấp được ở giai đoạn sau, mở ở cấp 70.

## Cộng hưởng cùng hệ

Tướng chia theo hệ: Hệ Lực, Hệ Khí, Hệ Kỹ, Hệ Kiếm, Hệ Chưởng, ngoài ra có vài tướng thuộc nhóm đặc biệt.

Số tướng cùng một hệ đứng chung trong đội quyết định mức cộng thêm cho cả đội, và mức đó tăng dần từ một tới năm tướng. Bước nhảy giữa bốn và năm tướng cùng hệ là đáng kể, nên một đội thuần hệ thường mạnh hơn đội gồm năm tướng lẻ dù từng người mạnh hơn.

## Cách thử cho rẻ

Khi bí ở một ải, hãy làm ba việc trước khi nghĩ tới chuyện nạp hay chiêu mộ:

- Đổi thứ tự đứng của các tướng hiện có.
- Thay một tướng lẻ hệ bằng một tướng cùng hệ với phần còn lại, dù chỉ số thấp hơn.
- Đổi sang trận pháp khác đang có.

Ba việc này không tốn tài nguyên và thường đủ để qua ải.',
  '', '', 0, 'published', '2026-08-23 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-vi-tri-truoc-sau', 'haitac', 'news', 'Vị trí trước sau và bốn nghề',
  'Tướng được xếp theo nghề: đỡ đòn ra hàng trước, trị liệu về hàng sau. Hiểu chỗ này rồi thì việc kéo thả trong đội hình mới có ý nghĩa.',
  'Ô đứng không chỉ để cho đẹp. Đứng trước hay đứng sau đổi hẳn việc ai hứng đòn và ai còn sống tới cuối trận.

## Bốn nghề

Tướng trong game chia làm bốn nghề: đỡ đòn, cận chiến sát thương, đánh xa và pháp thuật, cùng nhóm hỗ trợ và trị liệu.

Game có sẵn một bảng ưu tiên vị trí theo nghề, dùng khi bạn để hệ thống xếp tự động: nghề đỡ đòn được đưa lên hàng trước, nhóm trị liệu và hỗ trợ lùi về hàng sau, còn sát thương nằm ở khoảng giữa. Bảng này là điểm khởi đầu tốt, không phải phương án duy nhất.

## Khi nào nên sửa tay

- Đội chết quá nhanh: kiểm tra xem có ai đỡ đòn ở hàng trước chưa. Một hàng trước toàn tướng đánh xa thì trận nào cũng vỡ sớm.
- Người hồi máu chết trước: kéo họ về ô sau cùng, càng xa càng tốt.
- Đánh mãi không đủ sát thương: thử đưa một tướng sát thương lên gần hơn, đổi lấy rủi ro họ bị nhắm.

## Đội hình phòng thủ ở đấu trường

Đấu trường có một đội hình phòng thủ riêng, mở cùng lúc với đấu trường ở cấp 8. Đây là đội đứng ra chống lại khi người khác khiêu chiến bạn, và nó không tự đổi theo đội tấn công. Sau mỗi lần nâng cấp đáng kể, nhớ quay lại cập nhật đội phòng thủ — rất nhiều người quên mục này suốt nhiều tuần.

## Một lưu ý

Trận đánh chạy tự động, nên mọi thứ bạn quyết định đều nằm ở màn hình trước trận: ai ra sân, đứng đâu, và mang trận pháp nào. Đó cũng là chỗ đáng bỏ thời gian nhất.',
  '', '', 0, 'published', '2026-08-24 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-nuoi-tuong-cap-giai-sao', 'haitac', 'news', 'Nuôi tướng: cấp, tiến giai và sao',
  'Cấp tướng tối đa là 400 nhưng trần cấp bị khoá theo bậc tiến giai và số sao. Hiểu thứ tự khoá này là hiểu vì sao tướng của bạn ngừng lên cấp.',
  'Ba thứ quyết định sức mạnh của một tướng: cấp, bậc tiến giai và số sao. Chúng khoá lẫn nhau theo một thứ tự cố định.

## Cấp

Cấp tướng đi từ 1 tới 400, tốn kinh nghiệm tướng và kim tệ. Nguồn kinh nghiệm tướng chính là treo máy và phó bản kinh nghiệm.

## Trần cấp mở theo tiến giai và sao

Đây là chỗ hay làm người mới bối rối. Tướng ngừng lên cấp không phải vì hết kinh nghiệm mà vì chạm trần:

- Chưa tiến giai: dừng ở cấp 30.
- Tiến giai 1: lên tới 40.
- Tiến giai 2 kèm 2 sao: lên tới 50.
- Tiến giai 3 kèm 3 sao: lên tới 60.
- Tiến giai 4 kèm 4 sao: lên tới 80.
- Tiến giai 5 kèm 5 sao: lên tới 100.
- Tiến giai 6 kèm 6 sao: qua mốc 100.

Từ đó trở đi, mỗi lần thăng sao lại đẩy trần lên một nấc nữa, cho tới trần cuối là 400.

## Thăng sao

Thăng sao tốn tướng cùng loại hoặc mảnh của tướng đó, cộng thêm nguyên liệu. Mỗi nấc sao cho một khối chỉ số cố định và một phần chỉ số tăng theo cấp, nên tướng nhiều sao mạnh lên theo hai đường cùng lúc.

Tướng đạt 14 sao mở thêm hệ thống cảnh giới, với nhánh chỉ số và kỹ năng riêng.

## Đổi ý thì sao

Có chức năng hoàn tướng, mở ở cấp 20, và hiến tế tướng. Hiến tế trả lại một phần đá tiến giai và kim tệ theo bậc tiến giai đã đạt, nên tướng nuôi dở không mất trắng. Dù vậy, phần trả lại không bao giờ bằng phần đã bỏ ra, nên vẫn nên chọn kỹ ngay từ đầu.

## Kết luận thực dụng

Chọn ba tới năm tướng, ưu tiên cùng hệ, rồi đẩy chúng qua từng mốc tiến giai và sao. Cách này luôn nhanh hơn nuôi đều cả kho.',
  '', '', 0, 'published', '2026-08-25 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-trang-bi-va-bo-trang-bi', 'haitac', 'news', 'Trang bị, bộ trang bị và phụ ma',
  'Mỗi tướng có bốn ô trang bị. Trang bị chia sáu bậc phẩm chất và tới sáu sao, mặc đủ 2, 3 hay 4 món cùng bộ thì có thêm hiệu ứng.',
  'Trang bị là nguồn sức mạnh thứ hai sau bản thân tướng. Nó rẻ hơn nhiều so với thăng sao, nên đừng bỏ trống.

## Bốn ô

Mỗi tướng có bốn ô trang bị. Trang bị nhặt từ đẩy ải, phó bản, treo máy và các cửa hàng trong game.

## Phẩm chất và sao

Trang bị có sáu bậc phẩm chất và số sao từ 1 tới 6. Sao càng cao thì chỉ số gốc càng lớn, và đây cũng là điều kiện cho các bước nâng cấp sau: chỉ trang bị 6 sao đã giám định mới đưa vào tiến giai được.

## Bộ trang bị

Nhiều món thuộc cùng một bộ — ví dụ Bộ Nga My, Bộ Hiệp Khách, Bộ Phó Chưởng Môn. Mặc 2, 3 hoặc 4 món cùng bộ trên một tướng sẽ mở lần lượt ba mức hiệu ứng cộng thêm, mức sau bao gồm cả mức trước.

Vì vậy bốn món cùng bộ phẩm chất vừa phải thường tốt hơn bốn món lẻ phẩm chất cao. Khi so hai lựa chọn, hãy nhìn cả phần hiệu ứng bộ chứ không chỉ dòng chỉ số của riêng món đó.

## Nâng cấp trang bị

- Hợp thành và tinh luyện: gộp trang bị thấp thành trang bị cao hơn. Đây cũng là một mục trong nhiệm vụ hằng ngày.
- Tiến giai: dành cho trang bị 6 sao đã giám định, cho thêm chỉ số và một nhánh chỉ số theo chủng tộc.
- Phụ ma: hệ thống khảm thêm dòng chỉ số ngẫu nhiên, mở ở cấp 70, có cuộn phụ ma và bộ phụ ma riêng.

## Thói quen tốt

Mỗi lần đội hình đổi, kiểm tra lại xem tướng mới lên sân đã đủ bốn ô chưa. Rất nhiều trận thua chỉ vì một tướng vừa được đưa vào còn trống trang bị.',
  '', '', 0, 'published', '2026-08-25 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-chieu-mo-tuong', 'haitac', 'news', 'Bốn cách chiêu mộ tướng',
  'Chiêu mộ cơ bản, chiêu mộ bạn bè, chiêu mộ cao cấp và đổi bằng điểm triệu hồi. Mỗi kênh có nguồn chi phí riêng, và hai kênh cho lượt miễn phí mỗi ngày.',
  'Chiêu mộ mở ở cấp 2 và là nguồn tướng chính trong suốt cả quá trình chơi.

## Chiêu mộ cơ bản

Dùng thẻ chiêu mộ thường, mua theo lượt đơn hoặc gói mười lượt. Có một lượt miễn phí tự làm mới sau mỗi 24 giờ. Đây là nơi cho phần lớn tướng nền và nguyên liệu để thăng sao.

## Chiêu mộ bạn bè

Trả bằng điểm hữu nghị: 100 điểm cho một lượt, 1.000 điểm cho mười lượt. Điểm hữu nghị đến từ việc tặng và nhận quà qua lại với bạn bè trong game, mở ở cấp 5, và cũng là một mục trong nhiệm vụ hằng ngày.

Đây là kênh hoàn toàn miễn phí, chỉ cần bạn nhớ tặng quà mỗi ngày.

## Chiêu mộ cao cấp

Dùng thẻ chiêu mộ cao cấp; không có thẻ thì trả bằng Kim Cương. Kênh này cũng cho một lượt miễn phí mỗi 24 giờ, và có gói nhiều lượt một lần cho ai muốn quay dồn.

## Đổi bằng điểm triệu hồi

Mỗi lượt chiêu mộ đều cộng điểm triệu hồi, và các kênh cao cấp cộng nhiều hơn hẳn. Gom đủ 1.000 điểm thì đổi lấy một lượt chiêu mộ; mục này yêu cầu VIP 3.

Nghĩa là mọi lượt quay đều để lại một phần giá trị, kể cả lượt không ra gì.

## Mảnh tướng

Ngoài quay trực tiếp còn có mảnh tướng — mảnh ngẫu nhiên theo số sao, hoặc mảnh theo từng chủng tộc. Gom đủ mảnh thì ghép ra tướng, và mảnh cũng là nguyên liệu thăng sao.

Vì vậy đừng bỏ qua các cửa hàng đổi mảnh trong game: chúng biến những đồng tiền phụ khó tiêu thành tiến độ thật cho nhóm tướng chủ lực.',
  '', '', 0, 'published', '2026-08-26 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-doc-chi-so', 'haitac', 'news', 'Cách đọc chỉ số trong game',
  'HP, Công, Thủ, Tốc là bốn chỉ số nền. Ngoài chúng còn nhóm bạo kích, nhóm xuyên và kháng, nhóm tăng giảm sát thương — mỗi nhóm trả lời một câu hỏi khác nhau.',
  'Bảng chỉ số của tướng khá dài. Cách đọc dễ nhất là chia thành bốn nhóm.

## Nhóm nền

- HP: lượng máu.
- Công: sát thương gốc.
- Thủ: giảm sát thương nhận.
- Tốc: quyết định thứ tự ra đòn trong trận.

Tốc dễ bị xem nhẹ. Trong một trận đánh tự động, ai đi trước thường quyết định trận đấu, nhất là với tướng khống chế hoặc hồi máu.

## Nhóm bạo kích

- Tỉ lệ bạo: khả năng ra đòn chí mạng.
- Bạo thương: đòn chí mạng mạnh thêm bao nhiêu.
- Bạo kháng: giảm khả năng bị đối phương chí mạng.

Tỉ lệ bạo mà không có bạo thương thì hiệu quả kém, và ngược lại. Hai dòng này nên đi cùng nhau.

## Nhóm xuyên và kháng

- Vật kháng và Ma kháng: chống lại hai loại sát thương.
- Vật xuyên và Pháp xuyên: bỏ qua một phần kháng của đối phương.
- Kháng khống: giảm hiệu lực của các đòn khống chế.

## Nhóm tăng giảm

- Tăng thương và Giảm thương: cộng hoặc trừ thẳng vào sát thương cuối cùng.
- Thụ liệu: nhận được nhiều hay ít máu khi được hồi.
- Chính xác và Né: quyết định đòn đánh có trúng hay không.

## Còn lực chiến

Lực chiến là một con số gộp từ tất cả những thứ trên, tiện để so nhanh và để đối chiếu với mức gợi ý ở phó bản hay ải. Nó không biết đội bạn có ai đỡ đòn, có ai hồi máu, hay các tướng có cùng hệ hay không. Vì vậy lực chiến cao hơn mà vẫn thua là chuyện thường, và đó là lúc nên nhìn lại bốn nhóm chỉ số ở trên thay vì nhìn con số tổng.',
  '', '', 0, 'published', '2026-08-26 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-pho-ban-hang-ngay', 'haitac', 'news', 'Phó bản hằng ngày: năm loại, chín bậc',
  'Kim tệ, Kinh nghiệm, Anh hùng, Thần khí và Phù văn — mỗi loại có chín bậc khó từ Đơn giản tới Vực sâu, mỗi phó bản hai lượt miễn phí một ngày.',
  'Phó bản hằng ngày là nguồn tài nguyên đều đặn nhất trong game, và cũng là mục dễ quên nhất.

## Năm loại

- Phó bản Kim tệ: cho kim tệ, thứ tiêu tốn nhiều nhất khi nâng cấp tướng.
- Phó bản Kinh nghiệm: cho kinh nghiệm tướng.
- Phó bản Anh hùng: cho mảnh tướng.
- Phó bản Thần khí: cho nguyên liệu thần khí.
- Phó bản Phù văn: cho nguyên liệu phù văn.

Mục phó bản hằng ngày mở ở cấp 3, và cả năm nhánh mở đủ ở cấp 15.

## Chín bậc khó

Mỗi loại có chín bậc, đi từ Đơn giản, Phổ thông, Khó khăn, rồi Ác mộng 1 và 2, Địa Ngục 1 và 2, cuối cùng là Vực sâu 1 và 2. Bậc càng cao thì phần thưởng càng lớn, và mỗi bậc ghi sẵn một mức lực chiến để đối chiếu.

Cách chơi hợp lý là mỗi ngày thử bậc cao nhất bạn qua được, chứ không phải quét lại bậc thấp cho chắc.

## Lượt và quét

Mỗi phó bản cho hai lượt miễn phí mỗi ngày. Mua thêm lượt tốn 50 Kim Cương. Sau khi đã qua một bậc, bạn quét lại được thay vì đánh, và phần thưởng quét bằng đúng phần thưởng đánh.

## Ưu tiên khi thiếu lượt

Nếu chỉ đủ sức làm vài lượt mỗi ngày, thứ tự đáng chọn thường là: Kim tệ trước, vì mọi thứ đều tốn kim tệ; rồi tới Kinh nghiệm để đẩy cấp tướng; sau đó mới tới Anh hùng, Thần khí và Phù văn tuỳ hướng nuôi của bạn.

Nhiệm vụ hằng ngày cũng có một mục yêu cầu hoàn thành phó bản hằng ngày, nên làm mục này còn tiện thể xong nhiệm vụ.',
  '', '', 0, 'published', '2026-08-27 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-dau-truong-va-giai-vo-dich', 'haitac', 'news', 'Đấu trường và giải vô địch',
  'Đấu trường cho ba lượt miễn phí mỗi ngày, trả thưởng cả khi thua, và có rương tuần theo số lượt đã đánh. Giải vô địch thì chạy theo thể thức loại trực tiếp.',
  'Đây là hai mục đấu người chơi trong phạm vi một máy chủ, cùng mở ở cấp 8.

## Đấu trường

Bạn khiêu chiến đội hình phòng thủ của người khác. Mỗi ngày có ba lượt miễn phí, và mua thêm vé khiêu chiến bằng Kim Cương nếu muốn đánh nữa.

Thắng hay thua đều có thưởng, chỉ khác về mức — nên lượt miễn phí không bao giờ phí. Sau khoảng mười lần khiêu chiến, bạn được phép bỏ qua hoạt cảnh trận đấu để đi nhanh hơn.

Điểm đáng nhớ: bạn có một đội hình phòng thủ riêng, tách khỏi đội tấn công. Nó là thứ chống lại người khác khi họ khiêu chiến bạn, và nó không tự cập nhật. Sau mỗi lần nâng cấp lớn, quay lại sửa đội phòng thủ.

## Thưởng của đấu trường

- Thưởng theo hạng, trả mỗi ngày, chia theo bậc hạng — từ hạng nhất, rồi các bậc 2, 3, 4–5, 6–10, 11–20, 21–50, 51–100, 101–200, 201–500 và phần còn lại. Gồm danh vọng đấu trường và Kim Cương.
- Rương tuần mở theo số lượt đã khiêu chiến trong tuần, với các mốc 5, 10, 20, 40, 60, 80 và 100 lượt.
- Thưởng cuối mùa giải theo hạng đạt được.

Danh vọng đấu trường tiêu ở cửa hàng riêng của mục này.

## Giải vô địch

Giải vô địch chạy theo thể thức loại trực tiếp. Vòng tuyển chọn gồm sáu lượt với quy mô 128 người, sau đó lấy 32 người vào vòng loại trực tiếp: 32 chọn 16, 16 chọn 8, 8 chọn 4, rồi bán kết và chung kết.

Trước mỗi trận có một khoảng để bày trận và một khoảng để đặt cược, sau đó trận tự diễn ra. Bạn không thi đấu thì vẫn dự đoán và nhận thưởng theo kết quả cược được — đây là một mục trong nhiệm vụ tuần.',
  '', '', 0, 'published', '2026-08-28 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-bon-kieu-leo-thap', 'haitac', 'news', 'Bốn kiểu leo tháp',
  'Thông Thiên Tháp, năm tháp chủng tộc theo ngày trong tuần, Thí luyện vô tận với buff chọn dần, và Tam Thập Lục Trùng Thiên cho tướng đóng quân. Mỗi tháp một luật riêng.',
  'Leo tháp là phần thử thách đội hình. Bốn tháp dưới đây độc lập với nhau.

## Thông Thiên Tháp

Mở ở cấp 10, hơn 1.500 tầng, mỗi tầng một đội đối thủ cố định. Mỗi ngày có hai lượt khiêu chiến miễn phí, và mua thêm được tối đa ba lượt bằng Kim Cương với giá tăng dần.

Từ cấp 40, mục quét tháp tự động mở ra, quét được tối đa 100 tầng — rất tiện khi bạn đã bỏ tháp lâu và cần đuổi lại phần dễ.

Tháp có mốc thưởng theo tầng vượt được, và có bảng xếp hạng riêng.

## Năm tháp chủng tộc

Năm tháp tương ứng năm hệ: Tháp Lực, Tháp Khí, Tháp Kỹ, Tháp Kiếm, Tháp Chưởng. Mỗi tháp có 1.000 tầng và chỉ cho mang năm tướng đúng hệ của tháp đó.

Chúng mở theo ngày trong tuần: Tháp Lực thứ Hai, Tháp Khí thứ Ba, Tháp Kỹ thứ Tư, Tháp Kiếm thứ Năm, Tháp Chưởng thứ Sáu; thứ Bảy và Chủ Nhật thì cả năm tháp cùng mở. Mỗi ngày qua được tối đa 20 ải.

Điều kiện vào là đã qua ải 360 của tuyến chính. Vì mỗi tháp đòi một hệ riêng, đây là lý do rõ ràng nhất để nuôi thêm tướng ngoài đội chính.

## Thí luyện vô tận

Hơn 1.500 tầng, đánh liên tục. Điểm riêng của mục này là sau mỗi chặng bạn chọn một buff cộng dồn cho cả đội — bạo kích, phòng ngự, hiệu quả trị liệu, sát thương chí mạng, tốc độ, công kích hay kháng khống, mỗi loại cộng thêm 10%. Có cả lựa chọn hồi máu tức thời, dành cho lúc đội đã sứt mẻ.

Vì buff giữ lại tới các tầng sau, thứ tự chọn quan trọng không kém đội hình. Mục này có bảng xếp hạng riêng.

## Tam Thập Lục Trùng Thiên

36 tầng chia theo khu vực. Ngoài việc đánh qua ải để lấy sao, mỗi tầng còn cho bạn đóng quân một số tướng đạt yêu cầu về sao; tướng đóng quân sinh thưởng treo máy riêng theo chu kỳ. Muốn mở tầng sau thì phải gom đủ sao ở tầng hiện tại.',
  '', '', 0, 'published', '2026-08-29 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-cong-hoi-va-cong-hoi-chien', 'haitac', 'news', 'Công hội và công hội chiến',
  'Công hội mở ở cấp 15, có 30 cấp và giới hạn thành viên tăng dần. Công hội chiến chạy theo lịch cố định trong ngày, với giai đoạn đánh từ 12:00 tới 20:00.',
  'Công hội — trong game gọi là Bang — mở ở cấp 15 và là mục chơi chung đầu tiên bạn gặp.

## Công hội có gì

- 30 cấp. Cấp càng cao thì sức chứa thành viên càng lớn, bắt đầu từ 20 người.
- Đóng góp kim tệ hoặc Kim Cương để đổi lấy kinh nghiệm công hội và điểm cống hiến cá nhân.
- Cửa hàng công hội tiêu bằng điểm cống hiến.
- Kỹ năng công hội, nâng bằng tài nguyên chung, cộng chỉ số cho mọi thành viên.
- Phó bản công hội và BOSS công hội, cùng mở ở cấp 15.
- Hồng bao: thành viên gửi cho cả hội.

## Độ sinh động

Công hội có bảng nhiệm vụ sinh động riêng, gồm những việc như nâng kỹ năng công hội, đánh phó bản công hội, tiêu ở cửa hàng công hội, đóng góp kim tệ hoặc Kim Cương, và gửi hồng bao. Đủ mốc sinh động thì cả hội nhận thưởng.

Vì vậy một công hội đông mà im lìm không bằng một công hội ít người nhưng ai cũng làm vài việc mỗi ngày.

## Công hội chiến

Công hội chiến chạy theo lịch cố định trong ngày:

- Từ 00:00 tới khoảng 09:00: xác lập cặp đấu.
- Khoảng 09:00 tới 12:00: dựng dữ liệu chiến trường.
- 12:00 tới 20:00: giai đoạn đánh.
- 20:00 tới 00:00: giai đoạn nhận rương.

Bản đồ có 40 cứ điểm. Khi khiêu chiến, bạn chọn một trong ba mức khó: Đơn giản, Phổ thông hoặc Khó khăn. Mức khó hơn cho nhiều sao hơn và hệ số chiến tích cao hơn, nhưng đối thủ cũng được cộng chỉ số. Mức dễ thì ngược lại: đối thủ bị trừ chỉ số, đổi lại bạn nhận ít hơn.

Chọn mức khó là quyết định của từng người, nhưng tổng chiến tích là của cả hội — nên đánh mức vừa sức mà chắc thắng thường có lợi hơn cố mức khó rồi thua.',
  '', '', 0, 'published', '2026-08-30 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-lien-may-chu-va-xep-hang', 'haitac', 'news', 'Hoạt động liên máy chủ và các bảng xếp hạng',
  'Phần lớn hoạt động liên máy chủ mở ở cấp phiêu lưu 70. Trong game có tám bảng xếp hạng: năm bảng trong máy chủ và ba bảng dùng chung nhiều máy chủ.',
  'Khi máy chủ của bạn đã chạy một thời gian, phần chơi chung giữa nhiều máy chủ mới bắt đầu có ý nghĩa.

## Điều kiện

Gần như mọi hoạt động liên máy chủ mở ở cấp phiêu lưu 70. Trước mốc đó, bạn chỉ gặp người trong máy chủ của mình.

## Có những gì

- Thiên thang liên máy chủ: bảng xếp hạng tranh bá. Hạng càng cao thì phạm vi đối thủ được ghép càng hẹp, nên leo lên đỉnh khó dần chứ không đều tay.
- Đấu trường liên máy chủ: khiêu chiến người ở máy chủ khác, có rương mở theo số lượt đánh trong ngày và bảng xếp hạng riêng. Thưởng trả bằng công huân, tiêu ở cửa hàng của mục này.
- BOSS liên máy chủ: đánh chung một mục tiêu, thưởng chia theo thứ hạng.
- Giải đấu hạng liên máy chủ: hệ thống thăng hạng riêng, có cửa hàng và kho phần thưởng riêng.
- Xếp hạng Kim Cương và xếp hạng nạp giữa các máy chủ.

## Tám bảng xếp hạng

Trong máy chủ của bạn có năm bảng: tiến độ cốt truyện, tháp thí luyện, công hội, đấu trường và lực chiến.

Ba bảng còn lại dùng chung nhiều máy chủ: công hội liên máy chủ, lực chiến liên máy chủ và tranh bá liên máy chủ.

## Đọc bảng xếp hạng thế nào cho có ích

Bảng lực chiến cho biết mặt bằng chung của máy chủ, tiện để bạn tự ước lượng mình đang ở đâu. Bảng tháp và bảng cốt truyện thì phản ánh đội hình chứ không phản ánh mức đầu tư, nên chúng đáng xem hơn khi bạn muốn học cách người khác xếp đội.

Bảng xếp hạng chỉ lưu số lượng bản ghi có hạn, nên nó phản ánh nhóm dẫn đầu chứ không phải toàn bộ máy chủ.',
  '', '', 0, 'published', '2026-08-31 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-suu-tap-va-he-nuoi-phu', 'haitac', 'news', 'Sưu tập và các hệ nuôi ngoài tướng',
  'Sưu tập là hơn 140 món đeo cho tướng từ 3 sao trở lên. Ngoài ra còn Thú Linh, Thần Long, Mệnh Cách, Tinh Tú Đồ, Tiên Khí, Phù Văn — mỗi hệ một hướng riêng.',
  'Càng chơi lâu thì sức mạnh càng đến từ những hệ thống nằm ngoài bản thân tướng.

## Sưu tập

Sưu tập gồm hơn 140 món, đặt tên theo các bộ võ công. Tướng phải đạt từ 3 sao trở lên mới đeo được.

Món sưu tập chia làm hai kiểu: kiểu cho chỉ số cố định, và kiểu cho một nhóm chỉ số ngẫu nhiên rút từ kho thuộc tính. Có món gắn với một chủng tộc, một nghề hoặc thậm chí một tướng cụ thể, và những món đó cho hiệu quả cao nhất khi đeo đúng chỗ.

Quanh sưu tập còn có phong ấn, thức tỉnh và thu hồi, cùng các cách triệu hồi riêng để lấy món mới.

## Các hệ khác

- Thú Linh và Thú Hồn: nuôi riêng, có nhánh tình nghĩa và kỹ năng riêng.
- Thần Long: triệu hồi, cường hoá, có đồ giám và hệ thống ngự linh.
- Mệnh Cách: có phẩm chất, ô lắp, kho thuộc tính tẩy luyện rất lớn, và bộ Mệnh Cách.
- Tinh Tú Đồ: một cây nâng cấp cộng chỉ số cho cả đội.
- Tiên Khí và Thần Khí: nhánh trang bị đặc biệt, có kế thừa để chuyển tiến độ sang món mới.
- Phù Văn và Đồ Đằng: hai hệ khảm chỉ số, mỗi hệ có tháp và thánh điện riêng.
- Cảnh giới: mở cho tướng đạt 14 sao.

## Nên đi hướng nào trước

Không có câu trả lời chung, nhưng có một nguyên tắc dùng được: các hệ này gần như đều cộng cho cả đội hoặc chuyển được sang tướng khác, nên chúng an toàn hơn việc dồn hết vào một tướng.

Điểm chung thứ hai: hệ nào cũng có nhánh kế thừa hoặc thu hồi, nghĩa là đầu tư nhầm thì lấy lại được một phần. Vẫn nên đọc kỹ trước khi tiêu nguyên liệu hiếm.',
  '', '', 0, 'published', '2026-09-01 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-nguyen-bao-dung-lam-gi', 'haitac', 'news', 'Kim Cương dùng làm gì, và các loại tiền khác',
  'Kim Cương là tiền cao cấp trong game. Ngoài nó còn Kim tệ, Ngân lượng, điểm hữu nghị, danh vọng đấu trường, cống hiến công hội — mỗi loại chỉ tiêu ở đúng chỗ của nó.',
  'Game có nhiều loại tiền, và người mới hay tiêu nhầm chỗ. Đây là bức tranh chung.

## Kim Cương

Kim Cương là tiền cao cấp, dùng được ở gần như mọi chỗ. Những cách tiêu đáng giá nhất trong giai đoạn đầu:

- Chiến nhanh: mỗi lượt thu ngay 120 phút treo máy. Một lượt miễn phí mỗi ngày, ba lượt trả phí với giá tăng dần.
- Mua thêm lượt phó bản hằng ngày: 50 Kim Cương một lượt.
- Mua thêm lượt Thông Thiên Tháp: tối đa ba lượt mỗi ngày, giá tăng dần.
- Chiêu mộ cao cấp khi không có thẻ.
- Làm mới nhiệm vụ treo thưởng sau khi hết hai lượt miễn phí.
- Đóng góp Kim Cương cho công hội, đổi lấy cống hiến và độ sinh động.

## Kim tệ và Ngân lượng

Kim tệ là tiền thường, tiêu nhiều nhất khi nâng cấp tướng và trang bị. Nó luôn thiếu, nên phó bản Kim tệ đáng làm mỗi ngày.

Ngân lượng dùng cho nhiệm vụ treo thưởng — mỗi nhiệm vụ tốn một khoản ngân lượng và một khoảng thời gian để tướng đi làm.

## Những đồng tiền phụ

- Điểm hữu nghị: từ tặng quà bạn bè, dùng cho chiêu mộ bạn bè.
- Danh vọng đấu trường: từ đấu trường, tiêu ở cửa hàng của mục đó.
- Cống hiến công hội: từ đóng góp, tiêu ở cửa hàng công hội.
- Công huân liên máy chủ và điểm giải đấu hạng: từ các hoạt động liên máy chủ.
- Điểm tầm bảo, vinh dự, hồn tinh và một số loại khác gắn với từng mục cụ thể.

Nguyên tắc chung: đồng tiền phụ không chuyển đổi qua lại, và phần lớn có cửa hàng riêng. Đừng để chúng nằm không — hầu hết đều đổi được thành mảnh tướng hoặc nguyên liệu nâng cấp.

## Xu thì khác

Xu là tiền của cổng, không phải tiền trong game. Xu nằm ở ví tài khoản và dùng được cho mọi game trong hệ thống. Muốn có Kim Cương từ Xu thì mua ở trang Cửa hàng.',
  '', '', 0, 'published', '2026-09-01 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-moc-nap-va-x2-lan-dau', 'haitac', 'news', 'Tám mốc đổi Kim Cương và luật x2 lần đầu',
  'Tỉ lệ là 1 Xu đổi 1 Kim Cương, chia làm tám mốc từ 10.000 tới 2.000.000 Xu. Mỗi mốc được nhân đôi ở lần mua đầu tiên, và mọi lần mua đều cộng điểm VIP.',
  'Ở trang Cửa hàng, nhóm Kim Cương là cách đổi Xu sang tiền trong game.

## Tám mốc

Tám mốc lần lượt là 10.000, 20.000, 50.000, 100.000, 200.000, 500.000, 1.000.000 và 2.000.000 Xu. Mỗi mốc trả về đúng số Kim Cương bằng số Xu đã bỏ ra — tỉ lệ 1 đổi 1, không có mốc nào lợi hơn mốc nào về tỉ lệ gốc.

## Luật x2 lần đầu

Đây là chỗ có khác biệt thật sự. Mỗi mốc được tính riêng, và lần đầu tiên bạn mua một mốc thì game cộng thêm đúng số đó lần nữa. Ví dụ mốc 50.000 ở lần mua đầu tiên trả về 100.000 Kim Cương; từ lần thứ hai trở đi chỉ còn đúng 50.000.

Vì mỗi mốc tính riêng, phần thưởng lần đầu tồn tại ở cả tám mốc chứ không chỉ ở mốc nhỏ nhất.

## Điểm VIP

Mọi lần mua ở nhóm này đều cộng điểm VIP, kể cả lần thứ hai trở đi. Đó là vì game xử lý chúng đúng như một lần nạp trong game: cộng Kim Cương theo mốc, tính phần thưởng lần đầu, cộng điểm VIP, và tính vào các mốc tích nạp.

Cấp VIP mang lại phúc lợi nhận mỗi ngày, một hệ số nhân cho kinh nghiệm treo máy, và điều kiện mở một số mục.

## Hàng về đâu

Kim Cương vào thẳng nhân vật ở máy chủ bạn chọn lúc mua, không qua hòm thư. Trạng thái đơn hiện ngay trên trang Cửa hàng và tự cập nhật.

## Một lưu ý

Xu chỉ đi một chiều: từ ví vào game. Không có cách đổi ngược Kim Cương thành Xu, và Xu không quy đổi lại thành tiền.',
  '', '', 0, 'published', '2026-09-02 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-mua-goi-bang-xu-tren-web', 'haitac', 'news', 'Mua gói bằng Xu trên web: tám nhóm và hai đường phát hàng',
  'Trang Cửa hàng chia gói làm tám nhóm. Tuỳ nhóm mà phần thưởng vào thẳng nhân vật hoặc vào hòm thư trong game — trang gói luôn ghi rõ.',
  'Cửa hàng nằm trên trang của game và tiêu bằng Xu trong ví tài khoản. Bạn phải đăng nhập mới mua được, còn bảng giá thì ai cũng xem được.

## Tám nhóm

- Kim Cương: tám mốc đổi thẳng.
- Thẻ tuần: kích hoạt rồi nhận thưởng mỗi ngày trong bảy ngày.
- Quỹ: kích hoạt một lần, sau đó nhận thưởng theo từng mốc tiến độ trong game.
- Đặc quyền: mở thêm lượt hoặc thêm quyền lợi cho một mục cụ thể.
- Gói ngày: gói bán theo ngày mở máy chủ, có giới hạn lượt.
- Gói giới hạn: gói giới hạn theo tuần, tháng hoặc toàn máy chủ.
- Gói sự kiện: gói gắn với một hoạt động cụ thể trong game.
- Vật phẩm: gói do cổng tự định nghĩa, gửi qua thư.

## Các bước mua

- Mở trang Cửa hàng của game và chọn nhóm.
- Chọn gói, đọc phần nội dung và điều kiện.
- Chọn máy chủ và nhân vật sẽ nhận.
- Xác nhận. Xu bị trừ ngay và một đơn được tạo.

## Hai đường phát hàng

Mọi nhóm trừ Vật phẩm đều được game xử lý như một lần nạp: phần thưởng vào thẳng nhân vật và có cộng điểm VIP.

Gói thuộc nhóm Vật phẩm đi bằng thư trong game. Vì thư cần một người nhận cụ thể, bạn bắt buộc chọn nhân vật lúc mua, và không đổi được sau đó.

Trạng thái đơn tự cập nhật trên trang, thường xong trong khoảng một phút.

## Về các gói có điều kiện

Nhiều gói chỉ mua được trong một khoảng ngày kể từ khi máy chủ mở, hoặc giới hạn số lần mỗi ngày, hoặc đòi cấp VIP. Trang gói ghi điều kiện, nhưng nơi quyết định cuối cùng vẫn là game. Nếu game từ chối, Xu được hoàn lại ví.',
  '', '', 0, 'published', '2026-09-02 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-khi-nao-xu-duoc-hoan', 'haitac', 'news', 'Khi nào Xu được hoàn lại',
  'Xu tự trở về ví khi game từ chối phát hàng — hết lượt trong ngày, chưa tới ngày mở, chưa đủ điều kiện — hoặc khi hệ thống thử nhiều lần không xong.',
  'Mua gói là hai bước: cổng trừ Xu và tạo đơn, rồi game quyết định có phát hàng hay không. Bài này nói về bước thứ hai.

## Những lúc Xu được hoàn

- Gói giới hạn lượt trong ngày mà bạn đã dùng hết lượt.
- Gói chỉ mở trong một khoảng ngày kể từ khi máy chủ mở, và hiện đã ngoài khoảng đó.
- Gói đòi điều kiện mà nhân vật chưa đạt, ví dụ cấp VIP.
- Gói chỉ mua một lần mà nhân vật đã mua rồi.
- Hệ thống thử gửi lệnh phát hàng nhiều lần nhưng không thành.

Trong mọi trường hợp trên, đơn chuyển sang trạng thái đã hoàn Xu và số dư ví trở lại như cũ. Bạn không phải yêu cầu, và không phải chờ ai xử lý tay.

## Những lúc không hoàn

- Đơn đã phát đúng nhân vật và máy chủ bạn chọn. Kể cả khi bạn chọn nhầm, hàng vẫn đã ở đó.
- Gói đã gửi vào hòm thư. Thư đã gửi thì không thu về được.

Vì vậy bước đáng chậm lại là màn hình xác nhận: đọc kỹ dòng ghi nơi nhận trước khi bấm.

## Kiểm tra ở đâu

Lịch sử đơn nằm trên chính trang Cửa hàng, và toàn bộ biến động ví nằm ở trang tài khoản. Trạng thái đơn có ba nhóm: đang phát, đã phát hoặc đã gửi thư, và đã hoàn Xu.

## Vài điều khác về Xu

Xu thuộc về tài khoản chứ không thuộc riêng game nào, nên số dư dùng được ở mọi game trong cổng. Xu chỉ dùng để mua trong cổng và không quy đổi ngược thành tiền.

Nếu một đơn đứng ở trạng thái đang phát quá lâu, hãy tải lại trang trước đã. Vẫn không đổi thì báo cho bộ phận hỗ trợ kèm mã đơn.',
  '', '', 0, 'published', '2026-09-03 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-ba-dai-trang-thai-may-chu', 'haitac', 'notice', 'Ba dải trạng thái máy chủ nghĩa là gì',
  'Mượt, Đông và Đầy là ba mức tải thật của từng máy chủ, đọc từ số người đang chơi. Chúng quyết định máy chủ nào còn nhận người mới.',
  'Danh sách máy chủ hiện số người đang chơi kèm một trong ba dải. Số này lấy từ chính bộ đếm mà cổng vào game đang dùng, không phải con số trang trí.

## Ba dải

- Mượt: máy chủ còn dưới ngưỡng mềm. Nhận cả người mới lẫn người cũ.
- Đông: đã qua ngưỡng mềm. Người đã có nhân vật ở đó vẫn vào bình thường; người mới được hướng sang máy chủ khác cho khỏi chen.
- Đầy: đã qua cả biên tràn. Tạm thời không nhận thêm phiên mới, kể cả người cũ, cho tới khi bớt người.

## Vì sao đôi khi bị đưa sang máy chủ khác

Nút Chơi ngay chọn giúp một máy chủ đang Mượt nếu bạn chưa có nhân vật nào. Nếu bạn đã có nhân vật, hệ thống luôn đưa bạn về đúng máy chủ của nhân vật đó, kể cả khi máy chủ đó đang Đông.

Máy chủ đang bảo trì hoặc đã đóng thì không hiện trong danh sách chọn.

## Nên chọn Mượt hay Đông

Nếu bạn mới bắt đầu và không hẹn chơi cùng ai, cứ theo gợi ý và chọn máy chủ đang Mượt. Nếu bạn muốn chơi cùng bạn bè, hãy chọn đúng máy chủ của họ dù nó đang Đông — công hội, đấu trường và bạn bè đều tính trong phạm vi một máy chủ, nên vào chung nơi quan trọng hơn nhiều so với việc máy chủ thoáng hay đông.

## Gặp trạng thái Đầy thì làm gì

Đợi một lát rồi thử lại. Trạng thái này thay đổi liên tục theo số người đang chơi, không phải một lệnh khoá.',
  '', '', 0, 'published', '2026-09-04 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-nhan-qua-qua-hom-thu', 'haitac', 'notice', 'Nhận quà qua hòm thư trong game',
  'Gói thuộc nhóm Vật phẩm, quà hoạt động và các khoản đền bù đều tới bằng thư trong game. Mở hòm thư của đúng nhân vật đã chọn lúc mua để nhận.',
  'Có hai đường đưa hàng vào tài khoản của bạn, và trang gói luôn ghi rõ gói đó đi đường nào.

## Gói tính như một lần nạp

Phần thưởng vào thẳng nhân vật ở máy chủ bạn chọn, không qua hòm thư. Các mốc Kim Cương, thẻ tuần, quỹ, đặc quyền và gói ngày đều đi đường này. Kiểm tra chúng ở túi đồ và ở mục nạp trong game.

## Gói gửi qua thư

Nhóm Vật phẩm được gửi bằng thư trong game. Vì thư phải có người nhận cụ thể, bạn bắt buộc chọn nhân vật lúc mua.

- Vào game, mở hòm thư, nhận quà đính kèm.
- Chọn đúng nhân vật lúc mua: thư đã gửi thì không chuyển sang nhân vật khác được.
- Hòm thư có hạn thời gian lưu thư, nên nhận sớm.

Hòm thư mở ngay từ cấp 1, nên nhân vật mới cũng nhận thư được.

## Những gì khác cũng vào hòm thư

Không chỉ gói mua trên web. Thư còn là nơi nhận phần thưởng trả theo ngày của thẻ tuần, quỹ và đặc quyền, phần thưởng của nhiều hoạt động trong game, cùng các khoản đền bù khi có sự cố.

Vì vậy thói quen tốt là mở hòm thư mỗi lần vào game, trước cả khi làm gì khác.

## Nếu đơn báo đã gửi thư mà hòm thư trống

Thoát và vào lại game để tải lại hòm thư. Nếu vẫn không thấy, hãy báo hỗ trợ kèm mã đơn, tên máy chủ và tên nhân vật.',
  '', '', 0, 'published', '2026-09-04 16:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);

INSERT INTO news (slug, game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at)
VALUES ('haitac-bao-loi-can-kem-gi', 'haitac', 'notice', 'Báo lỗi thế nào cho xử lý được nhanh',
  'Một báo cáo dùng được cần: tên máy chủ, tên nhân vật, thời điểm, việc bạn đang làm, và mã đơn nếu liên quan tới mua bán. Kèm ảnh chụp màn hình thì càng tốt.',
  'Phần lớn thời gian xử lý một sự cố nằm ở khâu xác định bạn là ai và chuyện xảy ra lúc nào. Bạn rút ngắn được khâu đó.

## Luôn kèm năm thông tin

- Tên máy chủ, ví dụ S1. Một tài khoản có thể có nhân vật ở nhiều máy chủ.
- Tên nhân vật, viết đúng dấu.
- Thời điểm xảy ra, càng gần đúng càng tốt.
- Bạn đang làm gì lúc đó: đang đánh mục nào, đang bấm nút nào.
- Ảnh chụp màn hình, nếu chụp được.

## Nếu liên quan tới mua bán

Kèm thêm mã đơn và trạng thái đơn đang hiện trên trang Cửa hàng. Với đơn còn ở trạng thái đang phát, hãy tải lại trang trước — trạng thái tự cập nhật và nhiều trường hợp tự xong.

Nhắc lại cho rõ: khi game từ chối phát hàng, Xu được hoàn lại ví tự động. Bạn không cần yêu cầu hoàn, chỉ cần kiểm tra lại số dư.

## Vài sự cố tự xử lý được

- Màn hình trắng hoặc đứng ở màn hình tải: tải lại trang. Lần vào đầu tiên phải tải nhiều tài nguyên nên lâu hơn.
- Bị hỏi đăng nhập lại: phiên ở cổng đã hết hạn, đăng nhập lại ở trang tài khoản rồi vào lại.
- Không tìm thấy một chức năng: kiểm tra cấp phiêu lưu, vì phần lớn mục khoá theo cấp.
- Không thấy quà: mở hòm thư trong game trước khi báo lỗi.

## Một điều về an toàn tài khoản

Không đưa mật khẩu hay mã xác thực cho bất kỳ ai, kể cả người tự xưng là nhân viên hỗ trợ. Bộ phận hỗ trợ không bao giờ cần mật khẩu của bạn để xử lý sự cố.',
  '', '', 0, 'published', '2026-09-05 09:00:00')
ON DUPLICATE KEY UPDATE game_code=VALUES(game_code), kind=VALUES(kind), title=VALUES(title),
  summary=VALUES(summary), body=VALUES(body), image_url=VALUES(image_url), link_url=VALUES(link_url),
  pinned=VALUES(pinned), status=VALUES(status), published_at=VALUES(published_at);
