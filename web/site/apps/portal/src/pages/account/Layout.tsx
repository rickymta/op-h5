import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button, Msg } from "@op/site-ui";
import { errText } from "../../api";
import { useMe } from "../../lib/session";
import { useTitle } from "../../lib/title";
import { Loading, Main } from "../../lib/shell";

const NAV = [
  { href: "/tai-khoan", label: "Tổng quan" },
  { href: "/tai-khoan/vi", label: "Ví & nạp Xu" },
  { href: "/tai-khoan/lich-su", label: "Lịch sử" },
  { href: "/tai-khoan/nhan-vat", label: "Nhân vật" },
  { href: "/tai-khoan/bao-mat", label: "Bảo mật" },
];

/**
 * Điều hướng phụ của khu tài khoản. Máy tính: cột trái 220 px dính dưới thanh trên, mục đang
 * chọn có vạch đỏ bên trái. Dưới 720 px: thanh tab ngang cuộn được, mỗi tab ≥ 48 px, ẩn thanh
 * cuộn — không bao giờ để năm mục xếp thành một cột dài đẩy nội dung xuống dưới màn hình.
 *
 * Không nằm ở @op/site-ui vì chỉ cổng này có khu tài khoản; chợ và trang game không dùng.
 */
function SideNav({ items }: { items: { href: string; label: string; active?: boolean }[] }) {
  return (
    <nav aria-label="Mục" className="tb:sticky tb:top-[76px] tb:w-[220px] tb:self-start">
      <ul className="no-scrollbar m-0 flex list-none flex-row gap-1 overflow-x-auto border-b border-line p-0 tb:flex-col tb:gap-0.5 tb:overflow-visible tb:border-b-0">
        {items.map((it) => (
          <li key={it.href}>
            <a
              href={it.href}
              aria-current={it.active ? "page" : undefined}
              className={`flex min-h-12 flex-none items-center gap-2.5 whitespace-nowrap border-b-[3px] px-3 py-2 font-medium no-underline hover:text-fg hover:no-underline tb:min-h-touch tb:rounded-lg tb:border-b-0 tb:border-l-[3px] tb:py-2 tb:pl-[11px] tb:pr-3.5 tb:hover:bg-ink-850 ${
                it.active
                  ? "border-b-brand-500 text-fg tb:rounded-l-none tb:border-l-brand-500 tb:bg-ink-850"
                  : "border-b-transparent text-fg-muted tb:border-l-transparent"
              }`}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Khung khu tài khoản: cột trái (desktop) / tab ngang (điện thoại) + nội dung.
 * Khách → `/dang-nhap?next=<đường hiện tại>`; chưa biết là ai thì chờ, không nhảy trang sớm.
 */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  useTitle(title);
  const [loc, navigate] = useLocation();
  const me = useMe();

  useEffect(() => {
    if (me.data === null) navigate(`/dang-nhap?next=${encodeURIComponent(loc)}`, { replace: true });
  }, [me.data, loc, navigate]);

  if (me.isError) {
    return (
      <Main className="pt-5 tb:pt-8">
        <Msg tone="err">{errText(me.error)}</Msg>
        <Button variant="ghost" onClick={() => void me.refetch()}>Thử lại</Button>
      </Main>
    );
  }
  if (!me.data) {
    return (
      <Main className="pt-5 tb:pt-8">
        <Loading>{me.data === null ? "Đang chuyển tới trang đăng nhập…" : "Đang tải…"}</Loading>
      </Main>
    );
  }

  return (
    <Main className="pt-6">
      <div className="site-layout">
        <SideNav items={NAV.map((n) => ({ ...n, active: loc === n.href }))} />
        <div className="min-w-0 [&>*+*]:mt-4">{children}</div>
      </div>
    </Main>
  );
}
