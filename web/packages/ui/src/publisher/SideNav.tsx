import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Điều hướng phụ của trang tài khoản. Desktop: cột trái 220 px dính dưới thanh trên, mục đang
 * chọn có vạch `--accent` bên trái. Dưới 720 px: thanh tab ngang cuộn được, mỗi tab ≥ 44 px, ẩn
 * thanh cuộn. `children` (ví dụ ô số dư) nằm dưới danh sách. Bọc cùng nội dung bằng
 * `<div className="pb-layout">`.
 */
export function SideNav({
  items,
  children,
}: {
  items: { href: string; label: string; icon?: ReactNode; active?: boolean }[];
  children?: ReactNode;
}) {
  return (
    <nav className="pb-sidenav" aria-label="Mục">
      <ul className="pb-sidenav__list">
        {items.map((it) => (
          <li key={it.href}>
            <a
              href={it.href}
              className={cx("pb-sidenav__item", it.active && "is-active")}
              aria-current={it.active ? "page" : undefined}
            >
              {it.icon ? (
                <span className="pb-sidenav__icon" aria-hidden="true">
                  {it.icon}
                </span>
              ) : null}
              <span>{it.label}</span>
            </a>
          </li>
        ))}
      </ul>
      {children ? <div className="pb-sidenav__extra">{children}</div> : null}
    </nav>
  );
}
