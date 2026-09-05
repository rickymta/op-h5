import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button, Msg, SideNav } from "@op/ui/publisher";
import { errText } from "../../api";
import { useMe } from "../../lib/session";
import { useTitle } from "../../lib/title";

const NAV = [
  { href: "/tai-khoan", label: "Tổng quan" },
  { href: "/tai-khoan/vi", label: "Ví & nạp Xu" },
  { href: "/tai-khoan/lich-su", label: "Lịch sử" },
  { href: "/tai-khoan/nhan-vat", label: "Nhân vật" },
  { href: "/tai-khoan/bao-mat", label: "Bảo mật" },
];

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
      <main className="pb-main pt-page">
        <Msg tone="err">{errText(me.error)}</Msg>
        <Button variant="ghost" onClick={() => void me.refetch()}>Thử lại</Button>
      </main>
    );
  }
  if (!me.data) {
    return (
      <main className="pb-main pt-page">
        <p className="pt-loading">{me.data === null ? "Đang chuyển tới trang đăng nhập…" : "Đang tải…"}</p>
      </main>
    );
  }

  return (
    <main className="pb-main pt-account">
      <div className="pb-layout">
        <SideNav items={NAV.map((n) => ({ ...n, active: loc === n.href }))} />
        <div className="pt-account__body">{children}</div>
      </div>
    </main>
  );
}
