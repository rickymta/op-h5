// Nội dung hai khối chữ ở trang chủ: "Vì sao chơi ở đây" và "Câu hỏi thường gặp".
//
// Để riêng khỏi Home.tsx vì đây là chữ nghĩa, sửa thường xuyên hơn bố cục, và người sửa không
// cần đọc JSX. Câu trả lời dùng cùng khuôn văn bản thuần như các trang tĩnh (`- ` là gạch đầu
// dòng) nên dựng bằng chung một hàm.
//
// Mọi câu ở đây phải ĐÚNG với hệ thống đang chạy: không hứa tổng đài 24/7, không nêu con số
// không đo được, không nhắc tính năng chưa mở.

export interface WhyItem {
  title: string;
  text: string;
}

export const WHY_ITEMS: WhyItem[] = [
  {
    title: "Một tài khoản cho mọi game",
    text: "Đăng ký một lần rồi chơi mọi game trên cổng. Có game mới cũng không phải tạo tài khoản khác, không phải nhớ thêm mật khẩu.",
  },
  {
    title: "Ví Xu dùng chung",
    text: "Nạp một lần vào ví, tiêu ở game nào tuỳ bạn. Không phải chia tiền theo từng game, và số dư luôn thấy ngay trên thanh trên cùng.",
  },
  {
    title: "Chơi thẳng trên trình duyệt",
    text: "Không tải, không cài đặt. Mở trang là vào game, trên máy tính hay điện thoại đều được.",
  },
  {
    title: "Trạng thái máy chủ công khai",
    text: "Số máy chủ đang mở và tình trạng từng máy chủ hiển thị ngay trên trang, nên bạn biết chỗ nào còn nhẹ để vào chứ không phải đoán.",
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Xu là gì?",
    a: "Xu là đơn vị quy ước trong ví của cổng. Bạn nạp tiền thành Xu, rồi dùng Xu mua các gói vật phẩm trong cửa hàng của từng game. Xu nằm ở tài khoản cổng nên đổi sang game khác vẫn còn nguyên. Xu không quy đổi ngược lại thành tiền mặt.",
  },
  {
    q: "Nạp Xu bằng cách nào?",
    a: "Vào Tài khoản → Ví & nạp Xu. Nếu cổng nạp mới chưa mở, trang Ví sẽ chỉ bạn sang trang nạp của game — số Xu vẫn về đúng ví của bạn. Mỗi lần nạp đều hiện một dòng trong mục Lịch sử.",
  },
  {
    q: "Quy đổi Xu ra vật phẩm thế nào?",
    a: "Mở cửa hàng của game, chọn gói, chọn nhân vật hoặc máy chủ sẽ nhận, rồi xác nhận. Hệ thống trừ Xu và gửi lệnh phát hàng sang máy chủ game. Với các gói Nguyên Bảo, tỷ lệ hiện tại là 1 Xu = 1 Nguyên Bảo.",
  },
  {
    q: "Bao lâu thì nhận được vật phẩm?",
    a: "Thường trong vòng một phút.\n\n- Gói cộng thẳng vào tài khoản game: thấy ngay khi vào game.\n- Gói gửi qua hòm thư: mở hòm thư trong game để nhận.\n- Nếu máy chủ game từ chối đơn, Xu được hoàn lại tự động và bạn thấy một dòng \"Hoàn\" trong Lịch sử.",
  },
  {
    q: "Quên mật khẩu thì làm sao?",
    a: "Bấm \"Quên mật khẩu\" ở trang đăng nhập rồi nhập email khôi phục đã gắn với tài khoản; hệ thống gửi một liên kết đặt lại, hiệu lực trong ít phút. Tài khoản chưa gắn email thì phải nhờ bộ phận hỗ trợ — vì vậy nên thêm email khôi phục ngay từ đầu.",
  },
  {
    q: "Chơi trên điện thoại được không?",
    a: "Được. Game chạy trong trình duyệt điện thoại, không cần cài ứng dụng. Nên dùng bản mới của Chrome (Android) hoặc Safari (iOS), và nên dùng Wi-Fi ở lần vào đầu tiên vì phải tải khá nhiều dữ liệu.",
  },
  {
    q: "Một tài khoản dùng cho nhiều game thế nào?",
    a: "Bấm \"Chơi ngay\" ở game nào thì tài khoản trong game đó được tạo tự động từ tài khoản cổng — bạn không đăng nhập lần thứ hai. Danh sách game đã vào và nhân vật của bạn nằm ở mục Nhân vật trong tài khoản.",
  },
  {
    q: "Vào game mất bao lâu?",
    a: "Lần đầu, trình duyệt phải tải tài nguyên của game nên có thể mất vài phút tuỳ đường truyền. Những lần sau nhanh hơn hẳn vì tài nguyên đã nằm trong bộ nhớ đệm của máy bạn. Nếu màn hình tải đứng yên quá lâu, tải lại trang là cách nhanh nhất.",
  },
];
