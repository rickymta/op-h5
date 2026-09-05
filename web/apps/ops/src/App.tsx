import { Link, Route, Switch, useLocation } from "wouter";
import { Orders } from "./pages/Orders";

/** Thanh dieu huong: giu nguyen cac duong cua ban Go de nguoi truc khong phai hoc lai. */
function Nav() {
  const [loc] = useLocation();
  const item = (href: string, label: string) => (
    <Link href={href} style={loc === href ? { color: "var(--text)" } : undefined}>
      {label}
    </Link>
  );
  return (
    <header>
      <h1>Quản trị nền tảng</h1>
      <nav>
        {item("/", "Đội máy chủ")}
        {item("/nap-tay", "Nạp tay")}
        {item("/goi", "Gói")}
        {item("/don-mua", "Đơn mua")}
        {item("/nhat-ky", "Nhật ký")}
        <form method="POST" action="/dang-xuat" style={{ margin: 0 }}>
          <button className="ghost" type="submit">Thoát</button>
        </form>
      </nav>
    </header>
  );
}

/** Trang chua chuyen sang React thi tra ve ban Go (cung duong, khac tien to). */
function ChuaChuyen({ title, goPath }: { title: string; goPath: string }) {
  return (
    <main>
      <h2>{title}</h2>
      <p className="sub">Trang này vẫn dùng bản cũ trong khi chuyển dần sang giao diện mới.</p>
      <div className="card">
        <a href={goPath}>Mở bản cũ →</a>
      </div>
    </main>
  );
}

export function App() {
  return (
    <>
      <Nav />
      <Switch>
        <Route path="/don-mua" component={Orders} />
        <Route path="/">{() => <ChuaChuyen title="Đội máy chủ" goPath="/cu/" />}</Route>
        <Route path="/nap-tay">{() => <ChuaChuyen title="Nạp tay" goPath="/cu/nap-tay" />}</Route>
        <Route path="/goi">{() => <ChuaChuyen title="Gói cửa hàng" goPath="/cu/goi" />}</Route>
        <Route path="/nhat-ky">{() => <ChuaChuyen title="Nhật ký" goPath="/cu/nhat-ky" />}</Route>
        <Route>{() => <ChuaChuyen title="Không có trang này" goPath="/cu/" />}</Route>
      </Switch>
    </>
  );
}
