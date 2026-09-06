import { Route, Switch, useLocation } from "wouter";
import { Footer, LinkButton, TopBar, formatInt } from "@op/site-ui";
import { useInternalLinks, useScrollOnRoute } from "./lib/links";
import { useBalance, useMe, useSite } from "./lib/session";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Forgot } from "./pages/Forgot";
import { Reset } from "./pages/Reset";
import { NewsPage } from "./pages/News";
import { NewsDetailPage } from "./pages/NewsDetail";
import { ContentPage } from "./pages/Content";
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
    // Chợ là một bundle riêng do cùng tiến trình `id` phục vụ dưới `/cho`: liên kết thường,
    // trình duyệt tải lại trang (lib/links.ts để nguyên mọi đường bắt đầu bằng `/cho`).
    { href: "/cho", label: "Chợ" },
    { href: "/tin-tuc", label: "Tin tức", active: loc.startsWith("/tin-tuc") },
    // Trỏ vào trang Hỗ trợ của cổng chứ không ra thẳng kênh ngoài: trang đó luôn có nội dung
    // (bản mặc định nằm trong mã), còn `support_url` có thể chưa được đặt.
    { href: "/ho-tro", label: "Hỗ trợ", active: loc === "/ho-tro" },
  ];

  // Đã đăng nhập: "tên · số dư" thường trực (khảo sát: Steam). Chưa có số dư thì chỉ tên;
  // ở điện thoại chỉ giữ số dư (tên đã có trong trang tài khoản, cắt "ha…" thì vô nghĩa).
  const hideName = bal.data ? " hidden tb:inline" : "";
  const right = me.data ? (
    <LinkButton
      variant="ghost"
      href="/tai-khoan"
      className="max-w-[46vw] tb:max-w-[52vw]"
      aria-label={`Tài khoản ${me.data.username}`}
    >
      <span className={`overflow-hidden text-ellipsis whitespace-nowrap${hideName}`}>{me.data.username}</span>
      {bal.data && (
        <span className="font-mono font-medium nums text-gold-400">
          <span className={hideName}> · </span>
          {formatInt(bal.data.balance)} Xu
        </span>
      )}
    </LinkButton>
  ) : me.data === null ? (
    <LinkButton variant="ghost" href="/dang-nhap">
      Đăng nhập
    </LinkButton>
  ) : null;

  const notice = s?.notice
    ? { text: s.notice.title, href: s.notice.link_url || `/tin-tuc/${s.notice.slug || s.notice.id}` }
    : null;

  const footLinks = [
    { href: "/gioi-thieu", label: "Giới thiệu" },
    { href: "/ho-tro", label: "Hỗ trợ" },
    { href: "/dieu-khoan", label: "Điều khoản" },
    { href: "/chinh-sach", label: "Chính sách" },
    ...(s?.support_url ? [{ href: s.support_url, label: "Liên hệ" }] : []),
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
        <Route path="/tin-tuc/:key" component={NewsDetailPage} />
        <Route path="/gioi-thieu">{() => <ContentPage slug="gioi-thieu" />}</Route>
        <Route path="/ho-tro">{() => <ContentPage slug="ho-tro" />}</Route>
        <Route path="/dieu-khoan">{() => <ContentPage slug="dieu-khoan" />}</Route>
        <Route path="/chinh-sach">{() => <ContentPage slug="chinh-sach" />}</Route>
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
