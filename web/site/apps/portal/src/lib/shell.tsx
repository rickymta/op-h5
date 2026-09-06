// Vài khuôn bố cục lặp ở mọi trang của cổng. Không phải thành phần dùng chung của ba app nên
// không nằm ở @op/site-ui — chỉ là chỗ gom class Tailwind để mười sáu trang không chép tay
// cùng một chuỗi và lệch nhau vài pixel.
import type { ReactNode } from "react";

/** Khung nội dung: rộng tối đa 1180 px, canh giữa, chừa lề 24 px hai bên. */
export function Main({ className = "", children }: { className?: string; children: ReactNode }) {
  return <main className={`site-main ${className}`}>{children}</main>;
}

/** Đầu trang thường: tiêu đề lớn + một câu dẫn. */
export function PageHead({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="mb-1.5 text-[clamp(26px,4vw,36px)]">{title}</h1>
      {sub ? <p className="m-0 max-w-[60ch] text-sm text-fg-muted">{sub}</p> : null}
    </div>
  );
}

/** Đầu trang trong khu tài khoản: nhỏ hơn đầu trang công khai. */
export function AccountHead({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-1">
      <h1 className="text-2xl">{title}</h1>
      {sub ? <p className="m-0 mt-1.5 text-sm text-fg-muted">{sub}</p> : null}
    </div>
  );
}

/** Chỗ giữ lúc đang tải — cùng chiều cao với nội dung để trang không giật. */
export function Loading({ children = "Đang tải…" }: { children?: ReactNode }) {
  return <p className="py-5 text-fg-muted">{children}</p>;
}

/** Hàng nút cuối một khối. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap items-center gap-2.5">{children}</div>;
}
