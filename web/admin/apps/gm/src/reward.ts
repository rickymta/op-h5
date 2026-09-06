// Kiểm định dạng chuỗi quà `type:id:count` (nhiều món nối bằng `#`).
//
// CHỈ còn phép kiểm định dạng. Phần dịch mã ra tên đã chuyển hẳn về máy chủ
// (`/admin-portal/api/reward`, xem platform/internal/gmops/danhmuc.go): bảng tên là 6.588
// dòng đọc từ chính cấu hình máy chủ đang chạy — gửi hết xuống trình duyệt vừa nặng, vừa tạo
// ra một bản sao thứ hai sẽ lệch ngay lần đầu Excel đổi.
//
// Bảng tên cũ ở file này chỉ có ba dòng ví, còn vật phẩm thì hiện "Đạo cụ #100022" — tức là
// người trực vẫn phải đi tra ở chỗ khác. Đó là thứ đang được thay.

/** Y hệt `rewardRe` phía Go. Đổi ở đây thì phải đổi cả bên kia. */
export const REWARD_RE = /^\d+:\d+:\d+(#\d+:\d+:\d+)*$/;

export function rewardHopLe(s: string): boolean {
  return REWARD_RE.test(s.trim());
}
