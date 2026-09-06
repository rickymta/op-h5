// Bản mặc định của bốn trang nội dung tĩnh: Giới thiệu, Hỗ trợ, Điều khoản, Chính sách.
//
// Vì sao viết thẳng trong mã: cổng phải có nội dung ngay cả khi bảng `pages` trong DB còn
// trống (máy mới dựng, seed chưa chạy). Khi `GET /api/pages/{slug}` trả về một bản ghi thì
// bản trong DB THẮNG — người vận hành sửa qua trang quản trị mà không phải sửa mã.
//
// Khuôn `body` giống hệt khuôn trong DB (hợp đồng đợt 3, mục 3.3): văn bản thuần, đoạn cách
// nhau bằng dòng trống, `## ` mở tiêu đề phụ, `- ` mở gạch đầu dòng. Nhờ vậy cùng một hàm
// dựng (lib/content.tsx) lo được cả hai nguồn, và người vận hành sao chép bản mặc định ra rồi
// sửa vẫn hiển thị y như cũ.
//
// Nguyên tắc viết: chỉ nói điều đúng với hệ thống này. Không có tổng đài thì không hứa
// "hỗ trợ 24/7"; không có số liệu thì không bịa. Phần pháp nhân và giấy phép để trong ngoặc
// vuông — hàm dựng tô vàng mọi đoạn `[...]` nên nhìn là biết chỗ nào còn phải điền.
//
// `{brand}` được thay bằng tên cổng lấy từ `/api/site`.

export interface PageContent {
  title: string;
  body: string;
}

const gioiThieu: PageContent = {
  title: "Giới thiệu",
  body: `{brand} là cổng phát hành game H5 — game chạy thẳng trong trình duyệt, không phải tải về hay cài đặt. Một tài khoản dùng cho mọi game trên cổng, một ví Xu chung cho mọi giao dịch.

## Ba thứ bạn cần biết
- Tài khoản cổng: đăng ký một lần bằng tên đăng nhập và mật khẩu. Gắn thêm email khôi phục thì sau này tự lấy lại mật khẩu được.
- Tài khoản game: lần đầu bấm "Chơi ngay" ở một game, tài khoản trong game đó được tạo tự động từ tài khoản cổng. Bạn không phải nhớ thêm mật khẩu nào.
- Ví Xu: nạp một lần vào ví, tiêu ở cửa hàng của game nào tuỳ bạn. Mọi lần nạp, quy đổi và hoàn đều ghi lại trong mục Lịch sử.

## Xu và vật phẩm
Xu là đơn vị quy ước trong ví của cổng. Bạn dùng Xu mua các gói trong cửa hàng của từng game; gói được cộng thẳng vào tài khoản game hoặc gửi qua hòm thư trong game, tuỳ loại gói. Nếu máy chủ game từ chối đơn, hệ thống hoàn Xu lại vào ví và bạn thấy một dòng "Hoàn" trong lịch sử.

## Game đang mở
Danh sách game đang phát hành nằm ngay trang chủ, kèm số máy chủ đang mở và tình trạng từng máy chủ. Trang "Máy chủ" của mỗi game cho biết máy chủ nào còn nhẹ để người mới vào, máy chủ nào đã đông.

## Chơi trên thiết bị nào
Máy tính và điện thoại đều được, chỉ cần trình duyệt bản mới và mạng ổn định. Lần đầu vào game, trình duyệt phải tải tài nguyên nên hơi lâu; những lần sau nhanh hơn nhiều vì tài nguyên đã nằm trong bộ nhớ đệm.

## Liên hệ
Kênh hỗ trợ chính thức ghi ở chân trang. Trước khi hỏi, bạn có thể xem mục "Câu hỏi thường gặp" ở trang chủ và trang Hỗ trợ — phần lớn việc thường gặp đều tự xử lý được.`,
};

const hoTro: PageContent = {
  title: "Hỗ trợ",
  body: `Trang này gom những việc bạn tự làm được ngay và cách báo cho chúng tôi khi cần người xem giúp.

## Tự xử lý nhanh
- Quên mật khẩu: bấm "Quên mật khẩu" ở trang đăng nhập rồi nhập email khôi phục đã gắn với tài khoản. Chưa gắn email thì phải liên hệ hỗ trợ.
- Nghi có người khác vào tài khoản: mở Tài khoản → Bảo mật, xem danh sách phiên đăng nhập, bấm "Đăng xuất mọi nơi khác" rồi đổi mật khẩu.
- Mua rồi mà chưa thấy vật phẩm: mở hòm thư trong game trước — gói gửi qua thư nằm ở đó. Sau đó xem mục Lịch sử ở cổng để biết đơn đã phát hay chưa.
- Xu bị trừ nhưng đơn không thành: hệ thống tự hoàn Xu vào ví, thường trong ít phút. Nếu chờ lâu vẫn chưa thấy dòng "Hoàn" trong Lịch sử thì báo cho bộ phận hỗ trợ.
- Vào game bị đứng ở màn hình tải: thử tải lại trang, đổi sang mạng khác, hoặc mở bằng trình duyệt khác. Lần đầu vào game tải khá nhiều dữ liệu nên cần mạng ổn định.

## Khi báo lỗi, gửi kèm những thứ này
- Tên đăng nhập ở cổng. Tuyệt đối không gửi mật khẩu — chúng tôi không bao giờ cần đến nó.
- Tên game, tên máy chủ và tên nhân vật đang chơi.
- Thời điểm xảy ra (ngày, giờ) và ảnh chụp màn hình nếu có.
- Với việc liên quan đến Xu: mã giao dịch trong mục Lịch sử.

Có đủ những thông tin này thì việc tra cứu nhanh hơn nhiều, vì mọi giao dịch đều được ghi lại theo tài khoản và thời điểm.

## Cảnh giác với lừa đảo
Nhân viên không bao giờ hỏi mật khẩu, không hỏi mã OTP, không yêu cầu bạn chuyển tiền vào tài khoản cá nhân, và không nhắn tin riêng hứa tặng vật phẩm. Chỉ nạp qua đường chính thức trên tên miền này. Mua bán tài khoản hoặc Xu ngoài hệ thống không được bảo vệ và có thể làm mất tài khoản.

## Kênh liên hệ
Đường liên hệ chính thức nằm ở chân trang mọi trang trong cổng. [Người vận hành điền: kênh liên hệ, giờ làm việc và thời gian phản hồi thường thấy.]`,
};

const dieuKhoan: PageContent = {
  title: "Điều khoản sử dụng",
  body: `Khi tạo tài khoản hoặc sử dụng dịch vụ tại {brand}, bạn đồng ý với các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.

## 1. Đơn vị cung cấp dịch vụ
[Người vận hành điền: tên pháp nhân, địa chỉ, mã số doanh nghiệp, số giấy phép phát hành trò chơi và người chịu trách nhiệm nội dung.]

## 2. Tài khoản
- Bạn tự chịu trách nhiệm giữ tên đăng nhập và mật khẩu của mình. Mọi hoạt động phát sinh từ tài khoản được xem là do chủ tài khoản thực hiện.
- Nên gắn email khôi phục. Tài khoản không có email khôi phục thì việc lấy lại khi mất mật khẩu có thể không thực hiện được.
- Không dùng tài khoản của người khác; không mua bán, cho thuê hay chuyển nhượng tài khoản.
- [Người vận hành điền: yêu cầu độ tuổi tối thiểu và các điều kiện khác theo quy định áp dụng.]

## 3. Ví Xu và giao dịch
- Xu là đơn vị quy ước trong hệ thống, dùng để đổi lấy vật phẩm hoặc dịch vụ trong game. Xu không phải là tiền tệ và không được quy đổi ngược thành tiền mặt.
- Lệnh quy đổi Xu lấy vật phẩm là giao dịch cuối cùng: khi máy chủ game đã phát hàng thì không hoàn lại, trừ trường hợp lỗi hệ thống.
- Nếu máy chủ game từ chối đơn, hệ thống tự hoàn Xu vào ví. Mọi giao dịch đều được ghi trong mục Lịch sử của tài khoản.
- Vật phẩm, nhân vật và dữ liệu trong game do đơn vị vận hành quản lý; người chơi có quyền sử dụng trong thời gian dịch vụ còn hoạt động.

## 4. Hành vi bị cấm
- Dùng phần mềm can thiệp, công cụ tự động, hoặc lợi dụng lỗi phần mềm để trục lợi.
- Mua bán tài khoản, vật phẩm hoặc Xu bằng tiền mặt ngoài hệ thống.
- Quấy rối, xúc phạm người khác; đặt tên nhân vật hoặc phát ngôn vi phạm pháp luật và thuần phong mỹ tục.
- Dò tìm, tấn công, gây quá tải hoặc can thiệp vào hoạt động của hệ thống.

Tuỳ mức độ, tài khoản vi phạm có thể bị cấm chat, khoá tạm thời, khoá vĩnh viễn hoặc bị thu hồi vật phẩm phát sai.

## 5. Tạm ngừng và thay đổi dịch vụ
Dịch vụ có thể tạm ngừng để bảo trì hoặc cập nhật; thông báo được đăng ở mục Tin tức. Khi phải đóng một máy chủ hoặc một game, thông báo sẽ được đăng trước. [Người vận hành điền: thời hạn báo trước và cách xử lý Xu còn lại theo quy định áp dụng.]

## 6. Thay đổi điều khoản
Điều khoản có thể được cập nhật. Bản mới có hiệu lực kể từ khi đăng tại trang này; ngày cập nhật hiển thị ở cuối trang.

## 7. Liên hệ và giải quyết tranh chấp
Kênh liên hệ chính thức ghi ở chân trang. [Người vận hành điền: địa chỉ tiếp nhận khiếu nại, quy trình xử lý và cơ quan giải quyết tranh chấp.]`,
};

const chinhSach: PageContent = {
  title: "Chính sách bảo mật",
  body: `Chính sách này nói rõ {brand} thu thập dữ liệu gì khi bạn dùng cổng tài khoản và các game trên cổng, dùng vào việc gì, và bạn tự kiểm soát được những gì.

## 1. Dữ liệu thu thập
- Khi đăng ký: tên đăng nhập, mật khẩu (chỉ lưu dạng đã băm — hệ thống không giữ mật khẩu gốc), email khôi phục nếu bạn cung cấp.
- Khi đăng nhập: địa chỉ IP, mô tả trình duyệt và thiết bị, thời điểm đăng nhập — để bạn tự xem trong mục Bảo mật và để phát hiện đăng nhập lạ.
- Khi giao dịch: lịch sử nạp, quy đổi và hoàn Xu; đơn mua gói kèm tên máy chủ và nhân vật nhận hàng.
- Khi chơi: dữ liệu nhân vật do máy chủ game lưu (tiến độ, kho đồ, đội hình) để game hoạt động.

## 2. Dùng để làm gì
- Vận hành tài khoản và ví; phát vật phẩm đúng người, đúng máy chủ.
- Hỗ trợ khi có sự cố và tra cứu khi có khiếu nại.
- Phát hiện gian lận, lạm dụng và tấn công vào hệ thống.
- Thống kê tổng hợp (số người đang chơi, số máy chủ đang mở) — dạng số liệu chung, không gắn với cá nhân.

## 3. Chia sẻ với bên khác
Chúng tôi không bán dữ liệu người dùng. Dữ liệu chỉ được chia sẻ trong ba trường hợp: đơn vị thanh toán để đối soát chính giao dịch bạn thực hiện; nhà cung cấp hạ tầng nơi hệ thống vận hành; và cơ quan nhà nước có thẩm quyền khi có yêu cầu hợp pháp.

## 4. Lưu trữ
Dữ liệu tài khoản và giao dịch được giữ trong thời gian tài khoản còn hoạt động và một khoảng sau đó để đối soát. [Người vận hành điền: thời hạn lưu cụ thể và nơi đặt máy chủ.]

## 5. Bạn kiểm soát được gì
- Đổi mật khẩu, thêm hoặc đổi email khôi phục ở mục Bảo mật.
- Xem các phiên đăng nhập đang mở và đăng xuất mọi nơi khác.
- Yêu cầu xoá tài khoản qua kênh hỗ trợ chính thức. Lưu ý: xoá tài khoản làm mất Xu còn lại và toàn bộ nhân vật trong game, và không khôi phục được.

## 6. Cookie
Cổng dùng cookie phiên để giữ trạng thái đăng nhập. Không có cookie quảng cáo, không theo dõi bạn sang trang web khác. Xoá cookie sẽ làm bạn đăng xuất khỏi cổng.

## 7. Liên hệ
Câu hỏi về dữ liệu cá nhân gửi qua kênh hỗ trợ ghi ở chân trang. [Người vận hành điền: đầu mối phụ trách dữ liệu cá nhân.]`,
};

/** Bản mặc định theo slug. Slug nào không có ở đây thì trang trả 404 mềm. */
export const DEFAULT_PAGES: Record<string, PageContent> = {
  "gioi-thieu": gioiThieu,
  "ho-tro": hoTro,
  "dieu-khoan": dieuKhoan,
  "chinh-sach": chinhSach,
};
