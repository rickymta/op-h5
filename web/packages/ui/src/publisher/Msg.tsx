import type { ReactNode } from "react";

/** Thông báo trong trang: xanh/vàng/đỏ. Lỗi dùng role="alert" để trình đọc màn hình đọc ngay. */
export function Msg({ tone, children }: { tone: "ok" | "warn" | "err"; children: ReactNode }) {
  return (
    <p className={`pb-msg pb-msg--${tone}`} role={tone === "err" ? "alert" : "status"}>
      {children}
    </p>
  );
}
