import type { MouseEvent } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Footer, LinkButton, Msg, TopBar, formatInt } from "@op/site-ui";
import { errText } from "./api";
import { useImg, useMe, useMeta } from "./queries";
import { Home } from "./pages/Home";
import { Servers } from "./pages/Servers";
import { Store } from "./pages/Store";
import { Package } from "./pages/Package";
import { News } from "./pages/News";
import { NewsDetail } from "./pages/NewsDetail";
import { About, Faq, Guide } from "./pages/Content";
import { NotFound } from "./pages/NotFound";

/**
 * Đường do SPA phục vụ (hợp đồng 4.4, mở rộng ở đợt 3). Mọi đường khác — /choi-game, /auth/*,
 * id_base — là liên kết thường. Danh sách này phải khớp `mux.Handle` trong `cmd/adapter/main.go`
 * **và** các `location` trong `docker/nginx/game_site.conf`: thiếu một bên là 404 khi tải thẳng.
 */
const SPA_PATH = /^\/(may-chu|cua-hang(\/[^/]+)?|tin-tuc(\/[^/]+)?|gioi-thieu|huong-dan|faq)?$/;

export function App() {
  const meta = useMeta();
  const me = useMe();
  const [loc, navigate] = useLocation();

  const m = meta.data;
  const name = m?.name ?? "";
  // Tiêu đề tab do từng trang đặt ("Cửa hàng · <tên game>"); App không đặt để khỏi ghi đè —
  // effect của cha chạy SAU effect của con khi tải trang.
  //
  // Bản cũ còn đặt `--accent` theo `meta.accent`. Bảng màu nay chuẩn hoá trong preset dùng
  // chung (brand-500 = #EE4623, đúng giá trị mọi game đang dùng), nên không ghi đè lúc chạy nữa.

  const logo = useImg(m?.logo_url);
  const idBase = (m?.id_base ?? "").replace(/\/+$/, "");

  // Thành phần @op/site-ui dùng <a href> thường; ở đây đón bấm chuột lên các đường của SPA để
  // đổi route mà không tải lại trang. Bấm giữ Ctrl/Cmd, chuột giữa, target=_blank… đi theo
  // trình duyệt — nhờ vậy /choi-game và /auth/logout vẫn là redirect phía Go.
  function onClick(e: MouseEvent<HTMLDivElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest("a");
    if (!a || a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !SPA_PATH.test(url.pathname)) return;
    e.preventDefault();
    a.closest("details")?.removeAttribute("open"); // menu điện thoại
    navigate(url.pathname);
    window.scrollTo(0, 0);
  }

  const active = (p: string) => (p === "/may-chu" ? loc === p : loc === p || loc.startsWith(p + "/"));
  const links = [
    { href: "/may-chu", label: "Máy chủ", active: active("/may-chu") },
    { href: "/cua-hang", label: "Cửa hàng", active: active("/cua-hang") },
    { href: "/tin-tuc", label: "Tin tức", active: active("/tin-tuc") },
    { href: "/huong-dan", label: "Hướng dẫn", active: active("/huong-dan") },
  ];

  let right = null;
  if (me.data?.logged_in) {
    // Số dư đọc lỗi thì `/api/game/me` bỏ hẳn trường `balance`. Hiện "—" chứ không hiện "0 Xu":
    // người vừa nạp tiền mà thấy 0 sẽ tưởng mất tiền (QA đợt 3, V2).
    const bal = me.data.balance;
    right = (
      <>
        <a
          className="inline-flex min-h-touch items-center px-1.5 font-mono text-[13px] nums text-gold-400 hover:no-underline"
          href="/cua-hang"
          title={bal === undefined ? "Chưa đọc được số dư · vào cửa hàng" : "Số dư ví · vào cửa hàng"}
        >
          {/* Thanh trên hẹp: ẩn tên, chỉ còn số dư — tên đã có ở trang tài khoản. */}
          <span className="hidden font-sans text-fg-muted xs:inline">{me.data.username}&nbsp;·&nbsp;</span>
          {bal === undefined ? "—" : formatInt(bal)}
          <span className="ml-1 font-sans text-fg-muted">Xu</span>
        </a>
        <a className="inline-flex min-h-touch items-center px-2.5 text-sm text-fg-muted hover:text-fg hover:no-underline" href="/auth/logout">
          Thoát
        </a>
      </>
    );
  } else if (me.data) {
    right = (
      <LinkButton variant="ghost" href="/choi-game">
        Đăng nhập
      </LinkButton>
    );
  }

  const footLinks = [
    { href: "/gioi-thieu", label: "Giới thiệu" },
    { href: "/faq", label: "Hỏi đáp" },
    { href: idBase || "/", label: "Trang chính" },
    { href: `${idBase}/tai-khoan`, label: "Tài khoản" },
  ];
  if (m?.links.fanpage_url) footLinks.push({ href: m.links.fanpage_url, label: "Fanpage" });
  if (m?.links.group_url) footLinks.push({ href: m.links.group_url, label: "Nhóm" });
  if (m?.links.support_url) footLinks.push({ href: m.links.support_url, label: "Hỗ trợ" });

  return (
    <div onClick={onClick} className="min-h-screen bg-ink-900 text-fg">
      <TopBar brand={logo ? <img src={logo} alt={name} className="h-8 w-auto" /> : name || "…"} links={links} right={right} />
      {meta.isError ? (
        <div className="mx-auto w-full max-w-content px-4 pt-4 tb:px-6">
          <Msg tone="err">Không đọc được thông tin game: {errText(meta.error)}</Msg>
        </div>
      ) : null}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/may-chu" component={Servers} />
        <Route path="/cua-hang" component={Store} />
        <Route path="/cua-hang/:id">{(p) => <Package id={p.id ?? ""} />}</Route>
        <Route path="/tin-tuc" component={News} />
        <Route path="/tin-tuc/:key" component={NewsDetail} />
        <Route path="/gioi-thieu" component={About} />
        <Route path="/huong-dan" component={Guide} />
        <Route path="/faq" component={Faq} />
        <Route component={NotFound} />
      </Switch>
      <Footer
        brand={m?.brand ?? ""}
        links={footLinks}
        note={name ? `${name} · một tài khoản dùng chung cho mọi game trên hệ thống` : undefined}
      />
    </div>
  );
}
