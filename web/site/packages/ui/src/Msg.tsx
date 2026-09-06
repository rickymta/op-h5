import type { ReactNode } from "react";

const TONE = {
  ok: "bg-ok-bg text-ok-400 border-ok-500",
  warn: "bg-warn-bg text-warn-400 border-warn-500",
  err: "bg-danger-bg text-danger-400 border-danger-500",
} as const;

/** Thông báo trong trang: xanh/vàng/đỏ. Lỗi dùng `role="alert"` để trình đọc màn hình đọc ngay. */
export function Msg({ tone, children }: { tone: "ok" | "warn" | "err"; children: ReactNode }) {
  return (
    <p
      className={`mb-4 mt-0 rounded-md border-l-[3px] px-3.5 py-2.5 text-sm ${TONE[tone]}`}
      role={tone === "err" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

/** Ô trống có lời: "Chưa có tin.", "Chưa mua gì." — thay cho khoảng trắng im lặng. */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-7 text-center text-sm text-fg-muted">
      {children}
    </div>
  );
}
