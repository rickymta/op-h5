// Nội dung tĩnh viết sẵn cho trang game.
//
// Đây là **bản mặc định**. Nếu `GET /api/game/pages/{slug}` trả về bản ghi thì trang dùng bản
// trong DB (người vận hành sửa được ở trang quản trị) và bỏ hẳn bản này. Nhờ vậy trang có nội
// dung ngay từ lần triển khai đầu, không phải chờ seed.
//
// Khuôn `body` giống hệt khuôn của bảng `pages`: đoạn cách nhau bằng dòng trống, `## ` mở đầu
// một tiêu đề phụ, `- ` mở đầu một gạch đầu dòng. Văn bản thuần, không HTML.
//
// Nguồn dữ liệu cho mọi con số và tên gọi dưới đây: `server/excel-src/adventure` (16 chương /
// 1.000 ải, cột `挂机掉落ID` = bảng rơi đồ khi treo máy), `docs/excel-index.md` (tên các phó
// bản, tháp, BOSS, hoạt động PvP và liên server), `docs/design-cua-hang.md` mục 1 (tiền tệ,
// mốc nạp, hai cách phát hàng). Không viết điều gì không tra được ở ba nguồn đó.

export interface DefaultPage {
  title: string;
  body: string;
}

export const PAGE_GIOI_THIEU: DefaultPage = {
  title: "Giới thiệu",
  body: `Đây là game đấu tướng rảnh tay chơi thẳng trên trình duyệt: mở trang, đăng nhập, vào trận. Không có bản cài, không qua kho ứng dụng. Máy tính và điện thoại dùng chung một tài khoản, một tiến độ.

Lối chơi xoay quanh đội hình. Bạn thu thập tướng, xếp họ ra trận theo vị trí, rồi trận đánh tự diễn ra — thắng thua nằm ở chỗ chọn ai, đứng đâu và nuôi tướng nào trước, chứ không ở tốc độ bấm.

## Rảnh tay vẫn tiến

Bản đồ phiêu lưu có 16 chương và 1.000 ải. Mỗi ải kèm một bảng rơi đồ riêng cho lúc treo máy: đội hình tiếp tục kiếm tài nguyên ở ải xa nhất bạn đã qua, kể cả khi đã đóng trang. Quay lại là nhận, rồi đẩy tiếp.

## Có gì để đánh

- Phiêu lưu đẩy ải và phó bản hàng ngày — nguồn tài nguyên chính mỗi ngày.
- Các tháp thử thách: Thông Thiên Tháp, Tháp chủng tộc, Thí luyện vô tận, Tam Thập Lục Trùng Thiên.
- BOSS thế giới, BOSS toàn server, BOSS công hội và BOSS liên server.
- Đấu trường, Đấu trường chủng tộc, Giải vô địch và Giải vô địch tổ đội.
- Công hội: công hội chiến, bảo khố, BOSS riêng của hội.
- Hoạt động liên server: thiên thang, đấu trường liên server và bảng xếp hạng chung nhiều máy chủ.

## Nuôi tướng

Tướng lên cấp, tiến giai, thăng sao, mở kỹ năng và ghép duyên phận với nhau. Ngoài tướng còn có Thú Linh, Thần Long, Mệnh Cách, Sưu tập và Tinh Tú Đồ — mỗi hệ thống cộng sức mạnh cho cả đội chứ không riêng một tướng, nên càng về sau càng nhiều hướng để mạnh lên.

## Tài khoản và ví

Một tài khoản dùng cho mọi game trên hệ thống, và một ví Xu dùng chung. Nạp một lần vào ví, tiêu ở game nào tuỳ bạn. Cửa hàng web bán gói bằng Xu; tuỳ loại gói mà phần thưởng vào thẳng nhân vật hoặc vào hòm thư trong game.`,
};

export const PAGE_HUONG_DAN: DefaultPage = {
  title: "Hướng dẫn tân thủ",
  body: `Bốn việc dưới đây đủ để bắt đầu, và đều làm trong trình duyệt.

## 1. Tạo tài khoản

Bấm "Chơi ngay" ở trang chủ. Chưa có tài khoản thì trang tài khoản của hệ thống mở ra để đăng ký — chỉ cần tên đăng nhập và mật khẩu. Tài khoản này dùng chung cho mọi game trên hệ thống, nên lần sau không phải đăng ký lại.

## 2. Chọn máy chủ

Trang Máy chủ hiển thị trạng thái từng máy theo ba dải:

- Mượt — còn nhiều chỗ, nhận cả người chơi mới.
- Đông — vẫn vào được, nhưng người mới nên chọn máy khác.
- Đầy — tạm không nhận thêm phiên mới; người đang chơi không bị ảnh hưởng.

Người mới cứ theo dòng gợi ý "Người mới nên vào…" trên trang chủ. Nhân vật gắn với máy chủ, và gói mua trên web cũng phát về đúng máy chủ có nhân vật — nên chọn xong thì chơi ổn định ở đó.

## 3. Xây đội hình

Vào game, tạo nhân vật rồi đi theo tuyến nhiệm vụ mở đầu. Nó lần lượt mở các chức năng: chiêu mộ tướng, xếp đội hình, đẩy ải phiêu lưu, phó bản hàng ngày.

Vài điều nên biết sớm:

- Sức mạnh đến từ tướng nhiều hơn từ trang bị. Dồn tài nguyên cho vài tướng chủ lực thay vì rải đều.
- Vị trí đứng có ảnh hưởng. Đổi thứ tự trong đội hình rồi đánh lại là cách rẻ nhất để qua một ải khó.
- Nhận quà treo máy mỗi lần vào, và điểm danh hằng ngày.

## 4. Nhận quà qua hòm thư

Quà từ hoạt động, đền bù và các gói web thuộc loại "gửi thư" đều vào hòm thư trong game. Mở hòm thư của đúng nhân vật đã chọn lúc mua rồi bấm nhận. Thư có hạn lưu, đừng để tồn lâu.

## Quy đổi Xu

Xu là tiền chung của hệ thống, nạp ở trang tài khoản. Ở Cửa hàng, bạn chọn gói, chọn nhân vật nhận, xác nhận — Xu bị trừ và lệnh phát hàng chạy ngay.

- Gói Nguyên Bảo, thẻ, quỹ, đặc quyền: game xử lý như một lần nạp, phần thưởng vào thẳng nhân vật và tính cả điểm VIP.
- Gói vật phẩm: gửi qua hòm thư trong game.
- Game từ chối (hết lượt trong ngày, chưa tới ngày mở, chưa đủ VIP) thì Xu được hoàn lại ví tự động; bạn không phải yêu cầu.`,
};

export const PAGE_FAQ: DefaultPage = {
  title: "Câu hỏi thường gặp",
  body: `## Chơi game này có phải tải gì không?

Không. Game chạy thẳng trong trình duyệt. Lần đầu vào sẽ mất một lúc để tải tài nguyên, những lần sau nhanh hơn vì trình duyệt đã giữ lại.

## Xu và Nguyên Bảo khác nhau thế nào?

Xu là tiền của cổng, nằm trong ví tài khoản và dùng được cho mọi game trên hệ thống. Nguyên Bảo là tiền trong game này. Ở Cửa hàng, các mốc đổi theo tỷ lệ 1 Xu = 1 Nguyên Bảo; riêng mỗi mốc thì lần mua đầu tiên được game nhân đôi, giống hệt luật nạp trong game.

## Mua ở Cửa hàng bao lâu thì nhận được?

Lệnh phát hàng chạy ngay khi bạn xác nhận, thường xong trong khoảng một phút. Trạng thái đơn hiện ngay trên trang và tự cập nhật, không cần tải lại.

## Mua rồi mà không thấy vật phẩm đâu?

Xem trạng thái đơn ở Cửa hàng trước. "Đã gửi thư" nghĩa là quà nằm trong hòm thư của nhân vật bạn đã chọn — mở hòm thư và bấm nhận. "Đã phát" nghĩa là phần thưởng đã vào thẳng nhân vật, kiểm tra lại túi và mục nạp trong game.

## Vì sao có gói bấm mua không được?

Nhiều gói có điều kiện của game: giới hạn lượt mỗi ngày, yêu cầu cấp VIP, hoặc chỉ mở trong một khoảng ngày mở máy chủ. Cột Điều kiện chỉ ghi những gì cổng đọc được từ bảng cấu hình; phần lớn gói sự kiện không khai ở đó nên cột để trống, và game mới là nơi quyết định cuối cùng. Nếu điều kiện không thoả, game sẽ từ chối và Xu được hoàn lại ví tự động.

## Chọn nhầm nhân vật hoặc máy chủ nhận thì sao?

Quà phát về đúng nơi đã chọn và không chuyển được sang nhân vật khác. Hãy kiểm tra dòng "Nhận ở" trong bảng tóm tắt trước khi bấm xác nhận.

## Một tài khoản chơi được mấy máy chủ?

Không giới hạn: một tài khoản tạo được nhân vật ở nhiều máy chủ, mỗi nơi một tiến độ riêng. Ví Xu thì chỉ có một và dùng chung.

## Chơi trên điện thoại được không?

Được, mở bằng trình duyệt của điện thoại như trên máy tính. Cùng tài khoản, cùng nhân vật, cùng tiến độ.

## Quên mật khẩu thì làm thế nào?

Dùng chức năng "Quên mật khẩu" ở trang tài khoản của hệ thống. Mật khẩu là của tài khoản cổng, không phải của riêng game này.

## Vì sao nút Mua hiện chữ "Đăng nhập"?

Vì phiên của bạn đã hết hoặc bạn chưa đăng nhập. Bảng giá thì ai cũng xem được, còn mua thì cần đăng nhập để biết trừ Xu vào ví nào và phát hàng cho nhân vật nào.`,
};

/** Ba đoạn "Về game" trên trang chủ — rút từ bản giới thiệu, viết ngắn hơn cho khối trên đầu. */
export const HOME_ABOUT = [
  "Đấu tướng rảnh tay, chơi thẳng trên trình duyệt. Bạn thu thập tướng, xếp đội hình theo vị trí rồi để trận đánh tự diễn ra — thắng thua nằm ở chỗ chọn ai và nuôi tướng nào trước.",
  "Bản đồ phiêu lưu 16 chương, 1.000 ải. Mỗi ải có bảng rơi đồ riêng cho lúc treo máy, nên đội hình vẫn kiếm tài nguyên khi bạn đóng trang; quay lại là nhận rồi đẩy tiếp.",
  "Ngoài tuyến chính còn phó bản hàng ngày, các tháp thử thách, BOSS thế giới và công hội, đấu trường, công hội chiến, cùng những hoạt động liên server dùng chung bảng xếp hạng của nhiều máy chủ.",
];

/** "Đặc điểm" — sáu ô ngắn trên trang chủ. */
export const HOME_FEATURES: { title: string; text: string }[] = [
  {
    title: "Không cần tải",
    text: "Mở trang là chơi. Không bản cài, không kho ứng dụng; máy tính và điện thoại dùng chung một tiến độ.",
  },
  {
    title: "Rảnh tay tích luỹ",
    text: "Treo máy ở ải xa nhất đã qua, tài nguyên vẫn về khi bạn không mở game.",
  },
  {
    title: "Đội hình quyết định",
    text: "Vị trí đứng và duyên phận giữa các tướng ảnh hưởng tới trận đánh, không chỉ có chỉ số.",
  },
  {
    title: "Nhiều hướng nuôi",
    text: "Tướng, Thú Linh, Thần Long, Mệnh Cách, Sưu tập, Tinh Tú Đồ — mỗi hệ cộng sức mạnh cho cả đội.",
  },
  {
    title: "Đánh nhau mỗi ngày",
    text: "Đấu trường, giải vô địch, BOSS công hội và công hội chiến; thiên thang cùng đấu trường liên server.",
  },
  {
    title: "Một ví cho mọi game",
    text: "Nạp Xu một lần vào ví tài khoản, dùng ở game nào tuỳ bạn. Game từ chối thì Xu hoàn tự động.",
  },
];
