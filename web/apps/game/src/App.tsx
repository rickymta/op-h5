import type { MouseEvent } from "react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Footer, LinkButton, Msg, TopBar, formatInt } from "@op/ui/publisher";
import { errText } from "./api";
import { useImg, useMe, useMeta } from "./queries";
import { Home } from "./pages/Home";
import { Servers } from "./pages/Servers";
import { Store } from "./pages/Store";
import { News } from "./pages/News";
import { NewsDetail } from "./pages/NewsDetail";
import { NotFound } from "./pages/NotFound";

/** Tối màu hex đi ~18% cho trạng thái hover của nút chính (cùng công thức với Hero của @op/ui). */
function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.round(v * 0.82)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** Màu nhấn riêng của game đặt lên :root — mọi nút, eyebrow, tab đổi theo. Rỗng/sai thì giữ mặc định. */
function applyAccent(accent: string | undefined) {
  if (!accent || !/^#[0-9a-fA-F]{6}$/.test(accent)) return;
  const st = document.documentElement.style;
  st.setProperty("--accent", accent);
  st.setProperty("--accent-dim", darken(accent));
}

/** Đường do SPA phục vụ (hợp đồng 4.4). Mọi đường khác — /choi-game, /auth/*, id_base — là liên kết thường. */
const SPA_PATH = /^\/(may-chu|cua-hang|tin-tuc(\/[^/]+)?)?$/;

export function App() {
  const meta = useMeta();
  const me = useMe();
  const [loc, navigate] = useLocation();

  const m = meta.data;
  const name = m?.name ?? "";
  // Tiêu đề tab do từng trang đặt ("Cửa hàng · <tên game>"); App không đặt để khỏi ghi đè —
  // effect của cha chạy SAU effect của con khi tải trang.
  useEffect(() => applyAccent(m?.accent), [m?.accent]);

  const logo = useImg(m?.logo_url);
  const idBase = (m?.id_base ?? "").replace(/\/+$/, "");

  // Thành phần @op/ui dùng <a href> thường; ở đây đón bấm chuột lên các đường của SPA để đổi
  // route mà không tải lại trang. Bấm giữ Ctrl/Cmd, chuột giữa, target=_blank… đi theo trình duyệt.
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

  const active = (p: string) => (p === "/tin-tuc" ? loc.startsWith(p) : loc === p);
  const links = [
    { href: "/may-chu", label: "Máy chủ", active: active("/may-chu") },
    { href: "/cua-hang", label: "Cửa hàng", active: active("/cua-hang") },
    { href: "/tin-tuc", label: "Tin tức", active: active("/tin-tuc") },
  ];

  let right = null;
  if (me.data?.logged_in) {
    right = (
      <>
        <a className="pb-topbar__who gm-who" href="/cua-hang" title="Số dư ví · vào cửa hàng">
          <span className="gm-who__name">{me.data.username}</span>
          {formatInt(me.data.balance ?? 0)} Xu
        </a>
        <a className="pb-topbar__link gm-out" href="/auth/logout">
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

  const footLinks = [{ href: idBase || "/", label: "Trang chính" }, { href: `${idBase}/tai-khoan`, label: "Tài khoản" }];
  if (m?.links.fanpage_url) footLinks.push({ href: m.links.fanpage_url, label: "Fanpage" });
  if (m?.links.group_url) footLinks.push({ href: m.links.group_url, label: "Nhóm" });
  if (m?.links.support_url) footLinks.push({ href: m.links.support_url, label: "Hỗ trợ" });

  return (
    <div onClick={onClick}>
      <TopBar brand={logo ? <img src={logo} alt={name} /> : name || "…"} links={links} right={right} />
      {meta.isError ? (
        <div className="pb-main" style={{ paddingTop: 16, paddingBottom: 0 }}>
          <Msg tone="err">Không đọc được thông tin game: {errText(meta.error)}</Msg>
        </div>
      ) : null}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/may-chu" component={Servers} />
        <Route path="/cua-hang" component={Store} />
        <Route path="/tin-tuc" component={News} />
        <Route path="/tin-tuc/:id" component={NewsDetail} />
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
