# Tham khảo giao diện cổng game — khảo sát 2026-09-05

Gộp từ bốn nhánh khảo sát tự động (WebFetch + WebSearch, một nhánh dùng trình duyệt thật) phục vụ mục 15 của [plan-go-react.md](plan-go-react.md). Mọi nhận định đều ghi rõ **trực tiếp** (mở được trang) hay **gián tiếp** (qua bài viết, FAQ). Trang không mở được thì ghi "không mở được", không suy đoán.

Bảy ảnh tham khảo do người vận hành gửi (Redrex, Nexora launcher, storefront tối, WarHex, Game Island, GameTron, Solar/Redsky) có chung: nền tối gần đen, một màu nhấn đỏ/đỏ cam, tiêu đề trắng to đậm, hero full-bleed bằng key visual hoặc logo, nút chính đỏ đặc + nút phụ viền, hàng thẻ game có pill thể loại, danh sách tin có ảnh nhỏ + "x ngày trước", ô số liệu, thanh thông báo mỏng, avatar trên header, và ở hai ảnh dạng launcher là sidebar trái + thẻ bo góc.

## 1. Kết luận rút ra (đã áp vào hợp đồng giai đoạn 3)

| # | Kết luận | Bằng chứng | Áp dụng |
|---|---|---|---|
| 1 | Cổng Việt Nam tách ba vai: trang chính/catalog, trang game riêng, cổng nạp/ID | VNG (id.zing.vn tách khỏi shop.vnggames.com), Garena (lienquan.garena.vn tách khỏi napthe.vn), Funtap (corp → playfun → nap), GOSU (id/pay2) | Giữ đúng ba trang `domain` / `haitac.domain` / `id.domain` |
| 2 | Một shop chung cho mọi game, có mục "Dành cho bạn" trước danh sách đầy đủ | shop.vnggames.com (trực tiếp) | Trang chính: hero game nổi bật rồi mới tới lưới thẻ |
| 3 | Thẻ game có nhãn Mới/Hot và pill thể loại giúp định hướng; VTC/Soha không có nhãn nên khó phân biệt game mới | playfun.vn (trực tiếp), vtcgame.vn, sohagame.vn (trực tiếp) | Cột `badge` và `genre` trong `games` |
| 4 | Tin tức dạng tab "Tin game / Sự kiện", ảnh nhỏ + ngày | sohagame.vn (trực tiếp), playfun.vn | Bảng `news` với `kind` news/event/notice |
| 5 | Chân trang phải có giấy phép, pháp nhân, người chịu trách nhiệm, hotline, mạng xã hội | mọi cổng VN mở được; Funtap ghi số giấy phép G1 ngay footer | `ID_LEGAL_NOTE` in ở Footer |
| 6 | Cảnh báo lừa đảo, "không đưa OTP", "chỉ nạp qua kênh chính thức" là thông điệp lặp lại có chủ đích | Garena, VTC (gián tiếp qua FAQ/bài hướng dẫn) | Khối cảnh báo cố định ở trang Ví và bước xác nhận |
| 7 | Web shop nên liệt kê quy tắc ngay trên trang: phải đăng nhập, vật phẩm về hòm thư trong game, giá theo tài khoản, không hoàn | skre-shop.netmarble.com (trực tiếp) | Khối "Lưu ý" ở cửa hàng |
| 8 | Số dư ví hiện thường trực trên header | Steam (gián tiếp), Nexon đặt nút BUY NX cạnh logo (trực tiếp) | TopBar hiện `tên · số Xu` khi đã đăng nhập |
| 9 | Trang tài khoản: sidebar trái + thẻ, mỗi thẻ có nút "Quản lý" đi sâu; hiện "thiết bị tin cậy" để giáo dục bảo mật | account.hoyoverse.com (trực tiếp, bắt được khung dashboard) | Trang ID: sidebar desktop, **tab ngang ở điện thoại** (cổng VN không dùng sidebar; Zing ID chỉ là một form) |
| 10 | Trang game: hero full-bleed key visual + nút tải/chơi, nav marketing tách khỏi nav tiện ích (nạp, đổi code) | genshin.hoyoverse.com, lienquan.garena.vn, maplestory.nexon.net (trực tiếp) | Trang game: hero + gợi ý máy chủ, cửa hàng là mục riêng |
| 11 | Chuẩn hoá kích thước ảnh theo vị trí (logo, banner ngang, bìa dọc) | Epic Storefront Media Guide (trực tiếp) | Ba cột `logo_url` / `banner_url` (ngang) / `cover_url` (3:4) |
| 12 | Domain gốc không được để trống hay chuyển hướng lòng vòng | gosu.vn là trang placeholder; pay.zing.vn → shop.vnggames.com; pay.sohagame.vn → nap.sohagame.vn | `domain.com` là trang chính thật, một lần redirect duy nhất từ `www` |

## 2. Không bắt chước

- **Banner xoay tự động, popup, chat widget, khối giải đấu, thanh bạn bè/Discord**: có trong ảnh tham khảo và ở Netmarble/Game Island, tốn tài nguyên trên điện thoại mà không bán thêm gói nào.
- **Số liệu bịa** kiểu "Trusted by 30.250+": người chơi Việt nhạy với số ảo. Chỉ hiện số `live` từ Adapter; Adapter không trả lời thì ẩn ô đó.
- **Sidebar cố định trên điện thoại**: không cổng Việt Nam nào dùng; ở 375 px phải thành drawer, thêm một lớp thao tác. Dùng tab ngang cuộn được.
- **Bộ lọc catalog phức tạp** (Epic có filter cột phải, Steam có Discovery Queue): thừa khi dưới 40 game. Chừa sẵn một hàng pill thể loại, chưa bật.
- **Gộp trang doanh nghiệp với trang người chơi** (corp.funtap.vn, gamota.com): làm loãng nút Chơi ngay. Giới thiệu nền tảng chỉ là một section ngắn trên trang chính.
- **Nhiều tầng chuyển hướng cho cổng nạp**: mỗi lần redirect là một điểm rớt lòng tin khi đang cầm tiền thật.
- **Menu giấu hết vào hamburger trên desktop** (nexon.com): có chỗ thì hiện link.

## 3. Trade-off đã chấp nhận và việc tiếp theo

- **SPA và SEO.** Cổng VN mở được đều render sẵn ở server; nhóm quốc tế là SPA nặng tới mức công cụ fetch không đọc được. Ba app React của ta nhỏ (≤ 120 KB gzip) nhưng trang chính và trang tin vẫn trắng với bot tìm kiếm. Việc tiếp theo, chưa làm: `id` chèn `<title>`, `<meta name="description">`, `og:image` và một đoạn HTML tĩnh (tên game + tagline + tin mới) vào `index.html` theo route trước khi trả về. Chi phí nhỏ, làm sau khi giao diện ổn định.
- **Ô số liệu.** Khảo sát không thấy cổng VN nào dùng, ảnh tham khảo thì có. Giữ vì ta có số thật (online từ chính bộ đếm của cổng chặn tải), và chỉ hiện khi `live`.
- **Sidebar trang ID.** Ảnh GameTron/Nexora và HoYoverse dùng sidebar; Zing ID không. Chọn lai: sidebar ở desktop, tab ngang ở điện thoại, cùng một thành phần `SideNav`.

## 4. Ghi chú từng cổng

### Việt Nam

**VNG** — `id.zing.vn` (trực tiếp): chỉ một form đăng nhập, link quên mật khẩu, nút đăng ký, banner cập nhật điều khoản, footer Hỗ trợ/Điều khoản/Hướng dẫn/Chính sách/Hỏi đáp; không có ví trên trang này. `pay.zing.vn` → 302 `shop.vnggames.com/vn` (trực tiếp): header Games/Account/Club/Support, carousel, "DÀNH CHO BẠN", "DANH SÁCH GAME" lọc TẤT CẢ/MOBILE/PC, mỗi game nút "Nạp ngay", 4 thẻ tín hiệu tin cậy, footer đại lý thẻ/FAQ/điều khoản. `new.pay.zing.vn` và `pay.zing.vn/thezing/` là hai thế hệ giao diện cũ vẫn sống. `play.zing.vn` là ZingPlay (casual), không phải catalog toàn NPH. `games.zing.vn` đã chết DNS, không redirect.

**Garena** — `garena.vn`, `account.garena.com`, `ff.garena.com/vn` trả 403; `napthe.vn` là SPA rỗng với công cụ fetch. `lienquan.garena.vn` (trực tiếp): header logo + tải app + tìm kiếm + QR; menu ba nhóm Gameplay / Tin tức (Cập nhật, Sự kiện, Khuyến mãi, Giải đấu, Hướng dẫn) / Liên kết (Giftcode, Cộng đồng, Học viện, Tài khoản); trang chủ là tin mới, giải đấu, carousel tướng; nền tối, artwork lớn; nạp tiền tách hẳn sang `napthe.vn`. Luồng nạp (gián tiếp, nhiều bài hướng dẫn): chọn game → ID → mệnh giá → phương thức → xác nhận; thẻ cào ba nhà mạng, MoMo, ZaloPay, ShopeePay. "Giao diện Nạp Thẻ 2.0" triển khai từng phần từ 24/09/2025 có thông báo. Thông điệp lặp lại: cảnh báo domain giả, không đưa OTP.

**VTC Game** — `vtcgame.vn` (trực tiếp): hero lớn, menu Trang chủ / Nạp Game / Danh sách game / Bạn cần trợ giúp?, chọn 4 ngôn ngữ, thẻ game ảnh dọc + tên + PC/Mobile + mô tả + nút "TRANG CHỦ" sang site riêng; nửa dưới là nội dung doanh nghiệp (giải thưởng, đối tác). `pay.vtcgame.vn` không kết nối được; `napthe.vtcgame.vn/huong-dan` (trực tiếp): luồng 4–6 bước, liệt kê đầy đủ phương thức (chuyển khoản giảm 5%, ví VTC Pay/ZaloPay/VNPT Money/Appota/Viettel Pay/MoMo/ShopeePay, thẻ quốc tế, SMS), giới hạn 10–300.000 Vcoin/giao dịch, kênh hỗ trợ đa nền tảng.

**SohaGame** — `sohagame.vn` (trực tiếp): menu Trang chủ / Chơi ngay / Tin tức / Nạp Sohacoin / Tuyển dụng / Tài khoản; slider ảnh lớn + icon game + "Chơi ngay" + badge App Store/Google Play; lưới game 3–4 cột; tin tức tab "Tin game / Sự kiện" 4–5 bài có ảnh + ngày; footer giấy phép, hỗ trợ, mạng xã hội. **Nền đen, chữ trắng, nhấn vàng/cam, tiêu đề bold**: gần gu bảy ảnh nhất trong nhóm mở được. `nap.sohagame.vn` là SPA rỗng. Trang FAQ tài khoản 19 mục ghi pháp nhân và số giấy phép.

**Funtap** — `funtap.vn` → `corp.funtap.vn` (B2B). `playfun.vn` (trực tiếp): header đăng nhập, carousel, thẻ game có **nhãn new/hot**, bộ lọc thể loại, tin tức, giftcode, ví "Nạp thóc". `nap.funtap.vn` (trực tiếp): luồng chọn game → phương thức → mệnh giá → xác nhận; 9Pay, MoMo, Visa, Funcard…; footer logo đối tác thanh toán, email `Infosec@`, số giấy phép G1 và người chịu trách nhiệm nội dung.

**Gamota / GOSU / khác** — `games.gamota.com` và `nap.gamota.com` → `gig.vn` (SPA, chỉ thấy khung: Trang chủ / Trò chơi / Cửa hàng / Tải GiG). `gosu.vn` là trang placeholder trong khi `id.gosu.vn` (đăng nhập + Facebook/Google/QR) và `pay2.gosu.vn` (12 game, chọn VNĐ/GOSU Wallet/USD) vẫn chạy. `2game.vn` là cổng tin/giftcode nền tối. `vplay.onlive.vn` cổng H5 nhiều game nền tối, tag thể loại, "NẠP ONG". `360game.vn` đã đóng 2021 vì phụ thuộc Flash. Không xác nhận được `h5.vn`, "Gamobile", "Kingdom of Games".

### Quốc tế

**HoYoverse** — `account.hoyoverse.com` (trực tiếp, trình duyệt thật): sidebar 5 mục Account Overview / Personal Information / Password and Security / Link Account / Personalized Recommendations; nội dung dạng thẻ, mỗi thẻ có nút Manage; "ID: …" luôn hiện góc phải; thẻ bảo mật hiện "Trusted Devices" kèm giải thích; khi hết phiên có khoảnh khắc hiện dashboard rỗng rồi mới chuyển trang marketing (tránh). `genshin.hoyoverse.com` (trực tiếp): key visual full-bleed cả viewport, badge phiên bản, nút tải, thanh tiện ích nhỏ Redeem Code / Top-Up / Newcomer Rewards tách khỏi nav chính; trang cuộn theo section; nạp tiền nằm trong dropdown "More" (không nhấn mạnh).

**Nexon** — `nexon.com` (trực tiếp): nút "BUY NX" ngay cạnh logo; modal phát hiện khu vực theo IP có nút "STAY"; lưới "All Games" tên + thể loại; menu chi tiết giấu trong hamburger. `nexon.com/account/login`: hai tab LOG IN / CREATE AN ACCOUNT, luồng nhập tài khoản trước, mật khẩu sau, reCAPTCHA Enterprise, Google/Facebook/Apple/X. `maplestory.nexon.net`: nav hai tầng (hệ sinh thái Nexon + nav riêng game NEWS/GAME/RANKING/EVENTS/COMMUNITY/SUPPORT/MY MAPLE), nút PLAY NOW, tin có nhãn SALE/GENERAL. `bluearchive.nexon.com` báo trang không khả dụng.

**Netmarble** — `netmarble.com` (trực tiếp): header GAMES / ABOUT / SUPPORT, carousel 3 slide, "Featured Mobile Games" mỗi thẻ "Find Out More" + "Download", footer chọn ngôn ngữ và vị trí tách nhau. `skre-shop.netmarble.com` (trực tiếp): key visual + banner khuyến mãi, sắp xếp Newest/Lowest/Highest, và khối **"Warnings"** liệt kê quy tắc mua (đăng nhập game trước, giá theo quốc gia tài khoản, giao qua hòm thư trong game, tiền tệ chỉ bán qua web).

**Steam / Epic** — Steam bị chặn ở tầng môi trường; gián tiếp: số dư ví hiện dưới tên tài khoản góc trên phải, "Account details" có lịch sử mua, Family View ẩn lịch sử, trang store vừa mở rộng lên 1200 px với carousel theatre mode. Epic bị Cloudflare captcha; Storefront Media Guide (trực tiếp) chuẩn hoá Product Logo 960×540, carousel 1920×1080, ảnh landscape 2560×1440 và portrait 1200×1600; review bên ngoài chê thư viện thiếu sort/filter và cuộn chậm.

## 5. URL đã thử

Mở được trực tiếp: id.zing.vn, shop.vnggames.com/vn, new.pay.zing.vn/login, pay.zing.vn/thezing/, play.zing.vn, lienquan.garena.vn, vtcgame.vn, napthe.vtcgame.vn/huong-dan, beapro.vtcgame.vn (hạn chế), sohagame.vn, gamota.com, gig.vn (khung), corp.funtap.vn, playfun.vn, nap.funtap.vn, id.gosu.vn, pay2.gosu.vn, 2game.vn, gzone.vn, vplay.onlive.vn, account.hoyoverse.com, genshin.hoyoverse.com, netmarble.com, skre-shop.netmarble.com, nexon.com, nexon.com/account/login, maplestory.nexon.net, dev.epicgames.com (media guide).

Không mở được: games.zing.vn (DNS), vnggames.com/vn/vi (404), garena.vn (403), account.garena.com (403/SPA), nap.garena.vn (DNS), napthe.vn (SPA rỗng), ff.garena.com/vn (403), congdong.ff.garena.vn (rỗng), pay.vtcgame.vn (từ chối kết nối), nap.sohagame.vn (SPA rỗng), gosu.vn (placeholder), 360game.vn (đã đóng), vplay.vn/games (503), store.epicgames.com (captcha), store.steampowered.com (chặn môi trường), act.hoyoverse.com/account-system-sea/security.html (cần đăng nhập), bluearchive.nexon.com (không khả dụng), netmarble.com/en/tskgb (redirect về trang chủ).
