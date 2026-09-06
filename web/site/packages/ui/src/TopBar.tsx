import type { ReactNode } from "react";
import { cx } from "./cx";

export type TopBarLink = { href: string; label: string; active?: boolean; external?: boolean };

const LINK =
  "inline-flex items-center min-h-touch px-3 rounded-md text-fg-muted text-[14.5px] font-medium " +
  "no-underline hover:no-underline hover:text-fg hover:bg-ink-850 transition-colors duration-150";

function LinkItem({ l, sheet }: { l: TopBarLink; sheet?: boolean }) {
  return (
    <a
      href={l.href}
      className={cx(
        LINK,
        sheet && "min-h-12 text-base",
        // Gạch dưới đỏ ở thanh ngang; ở bảng gập (điện thoại) đổi thành vạch bên trái —
        // gạch dưới trong một cột dọc trông như đường kẻ phân cách chứ không như "đang ở đây".
        l.active && (sheet ? "text-fg shadow-[inset_3px_0_0_theme(colors.brand.500)]" : "text-fg rounded-b-none shadow-[inset_0_-2px_0_theme(colors.brand.500)]"),
      )}
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
  // Dải thông báo cũng là liên kết bấm được, nên ở điện thoại phải cao đủ 44 px
  // (12 + 12 padding + ~20 dòng chữ). Máy tính bàn dùng chuột thì mỏng lại cho gọn.
  const noticeCx =
    "block truncate border-b border-line bg-ink-800 px-4 py-3 text-center text-[13px] text-fg no-underline tb:py-[7px]";
  const noticeBody = (
    <>
      <span className="mr-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-gold-400">Thông báo</span>
      {notice?.text}
    </>
  );
  return (
    <>
      {notice ? (
        notice.href ? (
          <a className={cx(noticeCx, "hover:bg-line hover:no-underline")} href={notice.href} title={notice.text}>
            {noticeBody}
          </a>
        ) : (
          <div className={noticeCx} title={notice.text}>
            {noticeBody}
          </div>
        )
      ) : null}

      <header className="sticky top-0 z-30 border-b border-line bg-ink-900/[.86] backdrop-blur-[10px]">
        <div className="mx-auto flex min-h-topbar max-w-content items-center gap-2.5 px-3 tb:gap-4 tb:px-6">
          <a
            className="inline-flex min-h-touch min-w-0 shrink items-center gap-2 overflow-hidden whitespace-nowrap text-[15px] font-bold tracking-[-0.01em] text-fg no-underline hover:no-underline tb:shrink-0 tb:gap-2.5 tb:text-base"
            href="/"
          >
            {typeof brand === "string" ? <span className="truncate">{brand}</span> : brand}
          </a>

          <nav className="hidden flex-1 items-center justify-center gap-0.5 tb:flex" aria-label="Chính">
            {links.map((l) => (
              <LinkItem key={l.href + l.label} l={l} />
            ))}
          </nav>

          {right ? <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div> : null}

          {links.length > 0 ? (
            <details className="group shrink-0 tb:hidden [&>summary::-webkit-details-marker]:hidden">
              <summary
                className="inline-flex min-h-touch cursor-pointer list-none items-center gap-2 rounded-md border border-line px-4 font-semibold text-gold-400"
                aria-label="Mở menu"
              >
                Menu
                <span
                  aria-hidden="true"
                  className="h-2 w-2 -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:translate-y-0.5 group-open:-rotate-[135deg]"
                />
              </summary>
              <nav
                className="absolute inset-x-0 top-full flex flex-col border-b border-line bg-ink-900 px-3 pb-3 pt-2 shadow-sheet"
                aria-label="Chính (điện thoại)"
              >
                {links.map((l) => (
                  <LinkItem key={l.href + l.label} l={l} sheet />
                ))}
              </nav>
            </details>
          ) : null}
        </div>
      </header>
    </>
  );
}
