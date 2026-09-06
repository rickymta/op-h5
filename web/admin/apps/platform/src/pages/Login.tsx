import { useState } from "react";
import { LoginCard } from "@op/admin-ui";

/**
 * Đăng nhập.
 *
 * Phía Go `POST /dang-nhap` vẫn là **form thường**: nó đặt cookie `op_admin` rồi trả 302 về
 * `/`. Ở đây gửi bằng `fetch` với `redirect: "follow"` thay vì để trình duyệt submit form,
 * chỉ vì một lý do — form thật thì lỗi sai mật khẩu trả về một trang HTML khác, còn fetch
 * thì giữ nguyên màn hình và hiện câu lỗi ngay dưới ô nhập.
 *
 * Ba mã cần phân biệt: 401 sai tài khoản/mật khẩu, 429 sai quá nhiều lần (Go khoá tạm theo
 * cả tên đăng nhập lẫn IP), còn lại là hỏng thật.
 */
export function Login() {
  const [busy, setBusy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const gui = async (u: string, p: string) => {
    setBusy(true);
    setLoi(null);
    // Chế độ mock không có tầng Go: vào thẳng để còn xem được các trang.
    if (import.meta.env.VITE_MOCK === "1") {
      window.location.href = "/";
      return;
    }
    try {
      const res = await fetch("/dang-nhap", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: u, password: p }).toString(),
        redirect: "follow",
        credentials: "same-origin",
      });
      if (res.ok) {
        // Rời trang hẳn thay vì đổi route: cookie mới cần một vòng tải để mọi truy vấn
        // (kể cả /api/me đã cache) bắt đầu lại từ trạng thái sạch.
        window.location.href = "/";
        return;
      }
      setLoi(
        res.status === 429
          ? "Sai quá nhiều lần. Vui lòng thử lại sau ít phút."
          : res.status === 401
            ? "Tài khoản hoặc mật khẩu không đúng."
            : `Máy chủ trả lỗi HTTP ${res.status}.`,
      );
    } catch (e) {
      setLoi(`Không gửi được: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoginCard
      title="Quản trị nền tảng"
      sub="Tài khoản nhân viên, không phải tài khoản người chơi."
      busy={busy}
      error={loi}
      onSubmit={(u, p) => void gui(u, p)}
      footer="Quên mật khẩu thì nhờ một tài khoản owner đặt lại — mật khẩu mới hiện đúng một lần."
    />
  );
}
