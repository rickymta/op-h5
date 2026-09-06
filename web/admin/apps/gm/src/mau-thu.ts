// Mẫu thư cho các việc ca trực gặp hằng ngày.
//
// Không có mẫu thì mỗi người trực viết một kiểu, và một lỗi chính tả đi thẳng vào hòm thư
// của người chơi. Mẫu chỉ ĐIỀN SẴN — sửa thoải mái trước khi gửi. `{ten}` được máy chủ thay
// bằng tên nhân vật của TỪNG người nhận, nên một thư gửi hai mươi người vẫn gọi đúng tên.
//
// Danh sách này là điểm bắt đầu; muốn đổi lời thì sửa ở đây, chưa cần đưa vào bảng.

export interface MauThu {
  ma: string;
  nhan: string;
  tieuDe: string;
  noiDung: string;
}

export const MAU_THU: MauThu[] = [
  {
    ma: "den-bu",
    nhan: "Đền bù sự cố",
    tieuDe: "Đền bù sự cố",
    noiDung:
      "Chào {ten},\n\nHệ thống vừa gặp sự cố ảnh hưởng đến trải nghiệm của bạn. Ban quản trị gửi phần quà đền bù kèm thư này. Rất mong bạn thông cảm.\n\nChúc bạn chơi game vui vẻ!",
  },
  {
    ma: "ho-tro",
    nhan: "Trả lời hỗ trợ",
    tieuDe: "Phản hồi yêu cầu hỗ trợ",
    noiDung:
      "Chào {ten},\n\nBan quản trị đã xử lý yêu cầu hỗ trợ của bạn. Phần quà đính kèm là kết quả xử lý. Nếu còn thắc mắc, vui lòng liên hệ lại kênh hỗ trợ.\n\nCảm ơn bạn đã đồng hành!",
  },
  {
    ma: "hoan-tra",
    nhan: "Hoàn trả",
    tieuDe: "Hoàn trả giao dịch",
    noiDung:
      "Chào {ten},\n\nGiao dịch của bạn đã được hoàn trả theo yêu cầu. Vật phẩm đính kèm thư này. Vui lòng nhận trong hòm thư.\n\nCảm ơn bạn!",
  },
  {
    ma: "su-kien",
    nhan: "Thưởng sự kiện",
    tieuDe: "Phần thưởng sự kiện",
    noiDung:
      "Chào {ten},\n\nChúc mừng bạn đã đạt mốc trong sự kiện. Phần thưởng đính kèm thư này. Cảm ơn bạn đã tham gia!",
  },
];
