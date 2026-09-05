import type { ReactNode } from "react";
import { cx } from "./cx";

export type TopBarLink = { href: string; label: string; active?: boolean; external?: boolean };

function LinkItem({ l }: { l: TopBarLink }) {
  return (
    <a
      href={l.href}
      className={cx("pb-topbar__link", l.active && "is-active")}
      aria-current={l.active ? "page" : undefined}
      target={l.external ? "_blank" : undefined}
      rel={l.external ? "noopener" : undefined}
    >
      {l.label}
    </a>
  );
}

/**
 * Thanh trên dính đầu trang. `brand` bên trái, liên kết ở giữa, `right` bên phải (nút Đăng nhập
 * hoặc "tên · số dư Xu"). Dưới 720 px liên kết gập vào nút "Menu" (thẻ `<details>`, không cần
 * JS); `right` vẫn ở trên thanh vì số dư phải thường trực.
 *
 * `notice` là dải mỏng phía trên thanh, một dòng, dài quá thì cắt bằng dấu "…". Nó cuộn đi cùng
 * trang; chỉ thanh trên dính lại.
 *
 * Liên kết là `<a href>` thường (tải lại trang) — để `/choi-game`, `/auth/logout`… là redirect
 * phía Go hoạt động đúng. App muốn chuyển trang không tải lại thì tự bọc router ở tầng trên.
 */
export function TopBar({
  brand,
  links,
  right,
  notice,
}: {
  brand: ReactNode;
  links: TopBarLink[];
  right?: ReactNode;
  notice?: { text: string; href?: string } | null;
}) {
  const noticeBody = (
    <>
      <span className="pb-notice__k">Thông báo</span>
      {notice?.text}
    </>
  );
  return (
    <>
      {notice ? (
        notice.href ? (
          <a className="pb-notice" href={notice.href} title={notice.text}>
            {noticeBody}
          </a>
        ) : (
          <div className="pb-notice" title={notice.text}>
            {noticeBody}
          </div>
        )
      ) : null}
      <header className="pb-topbar">
        <div className="pb-topbar__in">
          <a className="pb-topbar__brand" href="/">
            {typeof brand === "string" ? <span>{brand}</span> : brand}
          </a>
          <nav className="pb-topbar__links" aria-label="Chính">
            {links.map((l) => (
              <LinkItem key={l.href + l.label} l={l} />
            ))}
          </nav>
          {right ? <div className="pb-topbar__right">{right}</div> : null}
          {links.length > 0 ? (
            <details className="pb-topbar__menu">
              <summary className="pb-btn pb-btn--ghost" aria-label="Mở menu">
                Menu
              </summary>
              <nav className="pb-topbar__sheet" aria-label="Chính (điện thoại)">
                {links.map((l) => (
                  <LinkItem key={l.href + l.label} l={l} />
                ))}
              </nav>
            </details>
          ) : null}
        </div>
      </header>
    </>
  );
}
