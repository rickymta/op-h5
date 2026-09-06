// Màn hình đăng nhập của công cụ GM.
//
// Cùng tài khoản, cùng cookie với trang quản trị nền tảng — đây chỉ là một lối vào khác cho
// cùng một phiên, không phải hệ thống người dùng thứ hai. Có màn hình riêng thay vì đẩy sang
// `/dang-nhap` của trang kia vì đăng nhập xong ở đó sẽ đứng lại ở trang chủ quản trị, còn
// người trực thì đang muốn vào /gm.

import { useState } from "react";
import { LoginCard } from "@op/admin-ui";
import { dangNhap } from "../phien";

export function DangNhap({ onXong }: { onXong: () => void }) {
  const [busy, setBusy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  return (
    <LoginCard
      title="Công cụ GM"
      sub="Dùng tài khoản nhân viên của trang quản trị. Vai trò từ gm trở lên mới thao tác được."
      busy={busy}
      error={loi}
      footer="Quên mật khẩu thì nhờ tài khoản owner đặt lại ở trang quản trị nền tảng."
      onSubmit={(u, p) => {
        setBusy(true);
        setLoi(null);
        dangNhap(u, p)
          .then(onXong)
          .catch((e: Error) => setLoi(e.message))
          .finally(() => setBusy(false));
      }}
    />
  );
}
