import { Route, Switch, useLocation } from "wouter";
import { Footer, LinkButton, TopBar, formatInt } from "@op/ui/publisher";
import { useInternalLinks, useScrollOnRoute } from "./lib/links";
import { useBalance, useMe, useSite } from "./lib/session";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Forgot } from "./pages/Forgot";
import { Reset } from "./pages/Reset";
import { NewsPage } from "./pages/News";
import { NewsDetailPage } from "./pages/NewsDetail";
import { StaticPage } from "./pages/Static";
import { NotFound } from "./pages/NotFound";
import { AccountLayout } from "./pages/account/Layout";
import { Overview } from "./pages/account/Overview";
import { Wallet } from "./pages/account/Wallet";
import { History } from "./pages/account/History";
import { Characters } from "./pages/account/Characters";
import { Security } from "./pages/account/Security";

/**
 * Cổng tài khoản: trang chính (`/`), tin tức, đăng nhập/đăng ký, khu tài khoản (`/tai-khoan/*`).
 * Một bundle cho cả `domain.com` lẫn `id.domain.com` — không phân biệt host.
 */
export function App() {
  const [loc] = useLocation();
  const site = useSite();
  const me = useMe();
  const bal = useBalance(!!me.data);
  useInternalLinks();
  useScrollOnRoute();

  const brand = site.data?.brand ?? "Cổng game";
  const s = site.data;

  const links = [
    { href: "/", label: "Trang chủ", active: loc === "/" },
    { href: "/#game", label: "Game" },
    { href: "/tin-tuc", label: "Tin tức", active: loc.startsWith("/tin-tuc") },
    ...(s?.support_url ? [{ href: s.support_url, label: "Hỗ trợ", external: true }] : []),
  ];

  // Đã đăng nhập: "tên · số dư" thường trực (khảo sát: Steam). Chưa có số dư thì chỉ tên;
  // ở điện thoại chỉ giữ số dư (tên đã có trong trang tài khoản, cắt "ha…" thì vô nghĩa).
  const right = me.data ? (
    <LinkButton variant="ghost" href="/tai-khoan" className={`pt-who${bal.data ? " pt-who--bal" : ""}`}
                aria-label={`Tài khoản ${me.data.username}`}>
      <span className="pt-who__name">{me.data.username}</span>
      {bal.data && (
        <span className="pt-who__xu"><span className="pt-who__sep"> · </span>{formatInt(bal.data.balance)} Xu</span>
      )}
    </LinkButton>
  ) : me.data === null ? (
    <LinkButton variant="ghost" href="/dang-nhap">Đăng nhập</LinkButton>
  ) : null;

  const notice = s?.notice ? { text: s.notice.title, href: s.notice.link_url || `/tin-tuc/${s.notice.id}` } : null;

  const footLinks = [
    { href: "/dieu-khoan", label: "Điều khoản" },
    { href: "/chinh-sach", label: "Chính sách" },
    ...(s?.support_url ? [{ href: s.support_url, label: "Hỗ trợ" }] : []),
    ...(s?.fanpage_url ? [{ href: s.fanpage_url, label: "Fanpage" }] : []),
  ];

  return (
    <>
      <TopBar brand={brand} links={links} right={right} notice={notice} />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dang-nhap" component={Login} />
        <Route path="/dang-ky" component={Register} />
        <Route path="/quen-mat-khau" component={Forgot} />
        <Route path="/dat-lai-mat-khau" component={Reset} />
        <Route path="/tin-tuc" component={NewsPage} />
        <Route path="/tin-tuc/:id" component={NewsDetailPage} />
        <Route path="/dieu-khoan">{() => <StaticPage kind="terms" />}</Route>
        <Route path="/chinh-sach">{() => <StaticPage kind="privacy" />}</Route>
        <Route path="/tai-khoan">{() => <AccountLayout title="Tổng quan"><Overview /></AccountLayout>}</Route>
        <Route path="/tai-khoan/vi">{() => <AccountLayout title="Ví & nạp Xu"><Wallet /></AccountLayout>}</Route>
        <Route path="/tai-khoan/lich-su">{() => <AccountLayout title="Lịch sử"><History /></AccountLayout>}</Route>
        <Route path="/tai-khoan/nhan-vat">{() => <AccountLayout title="Nhân vật"><Characters /></AccountLayout>}</Route>
        <Route path="/tai-khoan/bao-mat">{() => <AccountLayout title="Bảo mật"><Security /></AccountLayout>}</Route>
        <Route component={NotFound} />
      </Switch>
      <Footer brand={brand} links={footLinks} note={s?.legal_note || undefined} />
    </>
  );
}
