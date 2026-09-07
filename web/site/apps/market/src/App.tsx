import { Route, Router, Switch, useLocation } from "wouter";
import { Footer, TopBar } from "@op/site-ui";
import { BASE, to, useInternalLinks, useScrollOnRoute } from "./lib/nav";
import { PreviewBanner } from "./components/Preview";
import { Home } from "./pages/Home";
import { Listing } from "./pages/Listing";
import { Sell } from "./pages/Sell";
import { Mine } from "./pages/Mine";
import { NotFound } from "./pages/NotFound";

/**
 * Chợ Xu ⇄ Kim Cương — SPA riêng, tiến trình `id` phục vụ dưới `/cho` (hợp đồng mục 2).
 *
 * Đợt này **chỉ có giao diện**: dữ liệu lấy từ `src/demo-data.ts`, không gọi API, và mọi nút
 * thao tác tiền đều khoá. `PreviewBanner` nằm ngoài `Switch` nên có mặt ở mọi route.
 */
function Shell() {
  const [loc] = useLocation();
  useInternalLinks();
  useScrollOnRoute();

  const links = [
    { href: to("/"), label: "Bảng tin rao", active: loc === "/" },
    { href: to("/dang-ban"), label: "Đăng bán", active: loc === "/dang-ban" },
    { href: to("/cua-toi"), label: "Tin của tôi", active: loc === "/cua-toi" },
    // Ra khỏi tiền tố /cho là rời SPA này — để trình duyệt tải trang cổng chính.
    { href: "/", label: "Cổng chính" },
  ];

  return (
    <>
      <TopBar brand="Chợ Xu" links={links} />
      <PreviewBanner />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tin/:id">{(p) => <Listing id={p.id ?? ""} />}</Route>
        <Route path="/dang-ban" component={Sell} />
        <Route path="/cua-toi" component={Mine} />
        <Route component={NotFound} />
      </Switch>
      <Footer
        brand="Chợ Xu"
        links={[
          { href: to("/"), label: "Bảng tin rao" },
          { href: to("/dang-ban"), label: "Đăng bán" },
          { href: to("/cua-toi"), label: "Tin của tôi" },
          { href: "/", label: "Cổng chính" },
        ]}
        note="Bản xem trước giao diện: dữ liệu trên trang là mẫu, chưa có giao dịch thật và chưa có tiền nào được chuyển."
      />
    </>
  );
}

export function App() {
  return (
    <Router base={BASE}>
      <Shell />
    </Router>
  );
}
